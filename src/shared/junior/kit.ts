/** Helpers shared by the Junior (Grades 1–3) generators. */
import type { AnswerSpec, ChoiceOption, GeneratedQuestion, InputSpec, Misconception, Scene, Tile, GenContext } from '../questions/types.ts';
import type { MistakeCode } from '../questions/mistakes.ts';
import type { Rng } from '../questions/rng.ts';
import type { FoundationGrade } from '../curriculum/foundation.ts';
import * as enCore from './packs/en/core.ts';

/**
 * The language pack a generator writes in. Only English is reviewed today; other languages fall
 * back to English until their pack is written and reviewed (see languages.ts).
 */
export type CorePack = typeof enCore;
export function corePack(_ctx?: GenContext): CorePack {
  return enCore;
}

export const exactN = (value: number): AnswerSpec => ({ kind: 'numeric', value, tolerance: 0 });

export interface JQ {
  prompt: string;
  say?: string;
  scene?: Scene;
  input: InputSpec;
  answer: AnswerSpec;
  answerDisplay: string;
  hints: string[];
  solution: string[];
  misconceptions?: Misconception[];
}

/** A Junior question. Spoken text defaults to the written prompt. */
export function jq(q: JQ): GeneratedQuestion {
  return {
    prompt: q.prompt,
    say: q.say ?? q.prompt,
    ...(q.scene ? { scene: q.scene } : {}),
    input: q.input,
    answer: q.answer,
    answerDisplay: q.answerDisplay,
    hints: q.hints,
    solution: q.solution,
    misconceptions: q.misconceptions ?? [],
  };
}

export const miss = (code: MistakeCode, value: number, feedback: string): Misconception => ({ code, answer: exactN(value), feedback });

/** Keep numeric misconceptions that are whole, not negative, and differ from the answer and each other. */
export function keepJ(ms: Misconception[], correct: number): Misconception[] {
  const seen = new Set([correct]);
  return ms.filter((m) => {
    if (m.answer.kind !== 'numeric') return true;
    const v = m.answer.value;
    if (!Number.isInteger(v) || v < 0 || seen.has(v)) return false;
    seen.add(v);
    return true;
  });
}

export interface JOpt extends ChoiceOption {
  /** Spoken when this wrong option is chosen. */
  feedback?: string;
  code?: MistakeCode;
}

/** A tap-one-answer question. Every wrong option carries its own spoken explanation. */
export function choiceJ(
  rng: Rng,
  q: { prompt: string; say?: string; scene?: Scene; correct: JOpt; distractors: JOpt[]; code: MistakeCode; hints: string[]; solution: string[]; answerDisplay?: string; keepOrder?: boolean | 'numeric' },
): GeneratedQuestion {
  const all = [q.correct, ...q.distractors];
  const options = q.keepOrder === 'numeric' ? all.slice().sort((a, b) => Number(a.text) - Number(b.text)) : q.keepOrder ? all : rng.shuffle(all);
  return jq({
    prompt: q.prompt,
    ...(q.say ? { say: q.say } : {}),
    ...(q.scene ? { scene: q.scene } : {}),
    input: { kind: 'choice', options: options.map((o) => ({ id: o.id, text: o.text, ...(o.icon ? { icon: o.icon } : {}), ...(o.say ? { say: o.say } : {}) })) },
    answer: { kind: 'choice', id: q.correct.id },
    answerDisplay: q.answerDisplay ?? (q.correct.text || q.correct.say || ''),
    hints: q.hints,
    solution: q.solution,
    misconceptions: q.distractors.map((d) => ({ code: d.code ?? q.code, answer: { kind: 'choice', id: d.id }, feedback: d.feedback ?? q.solution[0] ?? '' })),
  });
}

/** Distinct numbers near `n` (for number choices), all within [lo, hi]. */
export function nearNumbers(rng: Rng, n: number, count: number, lo: number, hi: number, prefer: number[] = []): number[] {
  const out: number[] = [];
  for (const p of prefer) if (p !== n && p >= lo && p <= hi && !out.includes(p) && out.length < count) out.push(p);
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const d = rng.pick([1, 2, 10, 3, 5]) * (rng.chance(0.5) ? 1 : -1);
    const v = n + d;
    if (v !== n && v >= lo && v <= hi && !out.includes(v)) out.push(v);
  }
  return out;
}

/** Swap the last two digits: 31 → 13, 452 → 425. Returns null if that changes nothing. */
export function digitSwap(n: number): number | null {
  const s = String(n);
  if (s.length < 2) return null;
  const sw = Number(s.slice(0, -2) + s.at(-1) + s.at(-2));
  return sw === n || String(sw).length !== s.length ? null : sw;
}

export const tile = (id: string, text?: string, icon?: string, say?: string): Tile => ({ id, ...(text !== undefined ? { text } : {}), ...(icon ? { icon } : {}), ...(say ? { say } : {}) });

/** Range of a value by grade, e.g. calculations to 20 / 99 / 999. */
export const byGrade = <T>(g: FoundationGrade, v: Record<FoundationGrade, T>): T => v[g];

/** Spoken sums: "8 plus 5". */
export const sayOp = (op: '+' | '-' | '×' | '÷'): string => ({ '+': 'plus', '-': 'minus', '×': 'times', '÷': 'divided by' })[op];
/** Written sums use a proper minus sign. */
export const showOp = (op: '+' | '-' | '×' | '÷'): string => (op === '-' ? '−' : op);
