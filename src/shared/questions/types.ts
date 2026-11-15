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
  /** `fraction` adds a / key and a fraction placeholder; `cubes` adds a ³ key. */
  | { kind: 'expression'; prefix?: string; variables: string[]; fraction?: boolean; cubes?: boolean; placeholder?: string }
  /** An equation the learner types with one = sign; any equivalent rearrangement is accepted. */
  | { kind: 'equation'; variables: string[]; placeholder?: string }
  /** Complete a proof: a statement–reason table where some cells are blanks to fill from a list. Plain-text options (∠, ∥, △). */
  | { kind: 'proof'; rows: { s: ProofCell; r: ProofCell }[] }
  /** A coordinate pair, typed as name(x; y). */
  | { kind: 'point'; name: string }
  /** Solutions of an equation. The learner adds as many boxes as they need: how many solutions there are is part of the question. */
  /** `surds`: roots may be surds such as −3 + √7 (a √ key, and ± typed in one box gives two roots). */
  | { kind: 'roots'; variable: string; surds?: boolean }
  /** A solution set such as x < -2 or x > 3, typed, with a live number line. */
  | { kind: 'inequality'; variable: string }
  /** A formula checked by value (change the subject): division by variables, roots and π allowed. */
  | { kind: 'formula'; prefix?: string; variables: string[] }
  /** A number with square roots, e.g. 3 − 2√5; typed with a √ key. */
  | { kind: 'surd'; prefix?: string }
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

/** One cell of a proof table: given text, or a blank with options (ids are unique within the question). */
export type ProofCell = { text: string } | { blank: number; options: { id: string; text: string }[] };

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
  /** `simplified`: one algebraic fraction (or a polynomial) with no common factor top and bottom. */
  | { kind: 'expression'; expr: string; form?: 'expanded' | 'factorised' | 'simplified' | 'completed-square' }
  | { kind: 'equation'; expr: string }
  | { kind: 'point'; x: { n: number; d: number }; y: { n: number; d: number } }
  /** The right option for each blank, in blank order, and where each blank sits (for feedback). */
  | { kind: 'proof'; ids: string[]; at: { row: number; part: 'statement' | 'reason' }[] }
  /**
   * Rational roots in `values`. Roots that may be surds go in `surds` instead (each a list of terms with
   * square-free radicands, r = 1 the rational part); `requireSimplest` then asks for simplest surd form.
   */
  | { kind: 'roots'; values: { n: number; d: number }[]; surds?: { r: number; n: number; d: number }[][]; requireSimplest?: boolean }
  | { kind: 'inequality'; variable: string; set: IneqInterval[] }
  /** Graded by evaluating both formulas at sample points; `domain` is the range the variables are sampled from. */
  | { kind: 'formula'; expr: string; variables: string[]; domain?: [number, number] }
  /** An exact value c₁ + c₂√r₂ + …, as terms with square-free radicands (r = 1 is the rational part). */
  | { kind: 'surd'; terms: { r: number; n: number; d: number }[]; requireSimplest: boolean }
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
      /** `text` replaces the default "A(x; y)" label, e.g. "B(x; 5)" when a coordinate is unknown. */
      points?: { x: number; y: number; label?: string; text?: string }[];
      segments?: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[];
      /** Circles force equal scales on both axes, so they stay round. */
      circles?: { cx: number; cy: number; r: number }[];
      /** Curves sampled by the generator (parabolas, hyperbolas, exponentials, trig). One entry per unbroken branch. */
      curves?: { pts: [number, number][]; label?: string }[];
      /** A number line only (box-and-whisker plots): no y-axis. */
      hideY?: boolean;
      /** Fixed x tick step (90 for trig graphs in degrees). */
      xStep?: number;
      /** Axis titles, e.g. "Mark (%)" and "Cumulative frequency". */
      xTitle?: string;
      yTitle?: string;
    }
  | { kind: 'circuit'; voltage: number | null; resistors: (number | null)[]; current: number | null }
  | { kind: 'punnett'; parentA: string; parentB: string; reveal: boolean }
  /**
   * A Venn diagram with 2 or 3 sets. `regions` is keyed by the indices of the sets a region is inside:
   * '0' is in set 0 only, '01' in sets 0 and 1 only, '012' in all three, '' outside every set. Values are TeX.
   */
  | { kind: 'venn'; alt: string; sets: string[]; universe: string; regions: Record<string, string> }
  /** A tree diagram, two stages at most. Branch `p` is TeX (e.g. "\\frac{3}{8}"); `outcome` labels a leaf. */
  | { kind: 'tree'; alt: string; branches: TreeBranch[] }
  /** A two-way (contingency) table. The first row and column are headings. */
  | { kind: 'table'; alt: string; rows: string[][] }
  /** A solution set drawn on a number line (open and closed dots, arrows to infinity). */
  | { kind: 'numberline'; alt: string; set: IneqInterval[]; variable?: string }
  | GeometryFigure;

/** One interval of a solution set; null ends are infinite. */
export interface IneqInterval {
  lo: { n: number; d: number } | null;
  hi: { n: number; d: number } | null;
  loIn: boolean;
  hiIn: boolean;
}

export interface TreeBranch {
  label: string;
  p: string;
  outcome?: string;
  children?: TreeBranch[];
}

/**
 * A Euclidean geometry diagram, drawn by the client. Coordinates are maths coordinates (y up) in any units;
 * the client fits them to the box. Like a textbook sketch, it is "not drawn to scale" in spirit, but the
 * generators draw it close to scale so it never misleads.
 */
export interface GeometryFigure {
  kind: 'geometry';
  /** What a screen reader hears: the givens, never the answer. */
  alt: string;
  points: { id: string; x: number; y: number; label?: string; dot?: boolean }[];
  /** `text` labels the side (e.g. "7 cm" or "x"), drawn beside its midpoint, outside the figure. */
  segments?: { a: string; b: string; ticks?: 1 | 2; arrows?: 1 | 2; dashed?: boolean; extend?: number; text?: string }[];
  circles?: { c: string; r: number }[];
  /** An angle at vertex `at`, between rays to `from` and `to`, marked with `text` (e.g. "64°" or "x"). */
  /** `r` scales the arc radius, so two marks at one vertex don't overlap (default 1). */
  angles?: { at: string; from: string; to: string; text: string; right?: boolean; r?: number }[];
}

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
