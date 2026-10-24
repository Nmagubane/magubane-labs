import type { Difficulty, RichText } from '../questions/types.ts';

/** Interactive pieces a lesson can embed. Each maps to one reusable client component. */
export type WidgetSpec =
  | { type: 'number-line'; start: number; change: number }
  | { type: 'equation-balancer'; a: number; b: number; c: number; d: number }
  | { type: 'fraction-bars'; a: [number, number]; b: [number, number] }
  | { type: 'area-model'; p: number; q: number; target?: [number, number] }
  | { type: 'two-point-gradient'; a: [number, number]; b: [number, number] }
  | { type: 'line-explorer'; m: number; c: number }
  | { type: 'parabola-roots'; p: number; q: number }
  | { type: 'force-cart'; mass: number; force: number; friction: number }
  | { type: 'projectile-lab' }
  | { type: 'circuit-lab'; voltage: number; r1: number; r2: number }
  | { type: 'atom-builder'; protons: number; neutrons: number; electrons: number }
  | { type: 'chem-balancer'; level: Difficulty; index: number }
  | { type: 'cell-explorer' }
  | { type: 'punnett'; parentA: string; parentB: string }
  | { type: 'particle-lab'; substance: string }
  | { type: 'float-tank' }
  | { type: 'ph-lab' }
  | { type: 'conduction-race' }
  | { type: 'energy-drop' }
  | { type: 'parallel-lab' }
  | { type: 'key-explorer' }
  | { type: 'energy-pyramid' }
  | { type: 'pondweed-lab' }
  | { type: 'heart-path' }
  | { type: 'mitosis-lab' }
  // Natural Sciences & Technology, Grades 4–6
  | { type: 'living-sort' }
  | { type: 'bean-lab' }
  | { type: 'life-cycle-lab' }
  | { type: 'states-lab' }
  | { type: 'material-bench' }
  | { type: 'separation-lab' }
  | { type: 'sound-lab' }
  | { type: 'circuit-builder' }
  | { type: 'moon-lab' }
  | { type: 'planet-strip' }
  | { type: 'bridge-lab' }
  // Mathematics, Grades 4–6
  | { type: 'place-value-chart'; start: number }
  | { type: 'array-model'; rows: number; cols: number }
  | { type: 'fraction-of-set' }
  | { type: 'decimal-grid' }
  | { type: 'rectangle-lab'; target: number }
  // Mathematics, Grades 10–12
  | { type: 'exponent-ladder' }
  | { type: 'discriminant-lab' }
  | { type: 'sequence-plotter' }
  | { type: 'triangle-trig' }
  | { type: 'savings-growth' }
  | { type: 'tangent-lab' };

export type LessonBlock =
  | { kind: 'text'; body: RichText }
  | { kind: 'key-idea'; body: RichText }
  | { kind: 'widget'; title: string; task: RichText; widget: WidgetSpec }
  /** Science: commit to a prediction before experimenting. */
  | { kind: 'predict'; prompt: RichText; options: RichText[]; answer: number; explanation: RichText }
  /** A worked example generated fresh from the skill's question template. */
  | { kind: 'example'; level: Difficulty }
  /** A common wrong line of working, and why it's wrong. */
  | { kind: 'trap'; wrong: RichText; why: RichText }
  /** A quick check: graded on the server, counts (lightly) towards mastery. */
  | { kind: 'check'; level: Difficulty };

export interface Lesson {
  id: string;
  skillId: string;
  title: string;
  minutes: number;
  blocks: LessonBlock[];
}
