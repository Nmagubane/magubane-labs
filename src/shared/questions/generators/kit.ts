/** Small helpers shared by the science generators. */
import type { AnswerSpec, GeneratedQuestion, Misconception, RichText } from '../types.ts';
import type { MistakeCode } from '../mistakes.ts';
import type { Rng } from '../rng.ts';

export const num = (value: number, rel = 0.01): AnswerSpec => ({ kind: 'numeric', value, tolerance: rel, relative: true });
export const exact = (value: number): AnswerSpec => ({ kind: 'numeric', value, tolerance: 0 });

/** Keep numeric misconceptions that are finite and clearly different from the answer and from each other. */
export function keepNum(ms: Misconception[], correct: number): Misconception[] {
  const seen = [correct];
  return ms.filter((m) => {
    if (m.answer.kind !== 'numeric' || !Number.isFinite(m.answer.value)) return false;
    const v = m.answer.value;
    if (seen.some((s) => Math.abs(s - v) <= Math.abs(s) * 0.02 + 1e-9)) return false;
    seen.push(v);
    return true;
  });
}

export interface Opt {
  id: string;
  text: RichText;
  /** Shown when this wrong option is chosen. Required for distractors. */
  feedback?: RichText;
}

/** A multiple-choice question whose every wrong option is a diagnosed misconception. */
export function choice(
  rng: Rng,
  q: { prompt: RichText; correct: Opt; distractors: Opt[]; code: MistakeCode; hints: RichText[]; solution: RichText[]; answerDisplay?: RichText; keepOrder?: Opt[] },
): GeneratedQuestion {
  const options = q.keepOrder ?? rng.shuffle([q.correct, ...q.distractors]);
  return {
    prompt: q.prompt,
    input: { kind: 'choice', options: options.map((o) => ({ id: o.id, text: o.text })) },
    answer: { kind: 'choice', id: q.correct.id },
    answerDisplay: q.answerDisplay ?? q.correct.text,
    hints: q.hints,
    solution: q.solution,
    misconceptions: q.distractors.map<Misconception>((d) => ({ code: q.code, answer: { kind: 'choice', id: d.id }, feedback: d.feedback ?? `That isn't it. ${q.solution[0] ?? ''}` })),
  };
}

/** "−5 °C" with a proper minus sign. */
export const degC = (t: number): string => `${t < 0 ? '−' : ''}${Math.abs(t)} °C`;
/** Plain-text number with a proper minus sign and up to 2 decimals. */
export const n = (v: number, dp = 2): string => {
  const r = Math.round(v * 10 ** dp) / 10 ** dp;
  return `${r < 0 ? '−' : ''}${Math.abs(r)}`;
};
export const cap = (s: string): string => s[0]!.toUpperCase() + s.slice(1);

/** A fact question: a prompt, the right answer, wrong answers each with their own explanation. */
export interface PoolItem {
  q: RichText;
  a: RichText;
  wrong: [RichText, RichText][];
  why: RichText;
}

export function poolQuestion(rng: Rng, item: PoolItem, code: MistakeCode, hint: RichText): GeneratedQuestion {
  return choice(rng, {
    prompt: item.q,
    correct: { id: 'c', text: item.a },
    distractors: item.wrong.map(([text, feedback], i) => ({ id: `w${i}`, text, feedback })),
    code,
    hints: [hint],
    solution: [item.why],
  });
}

/** Ask which of a fixed set of labels applies (e.g. Living / Non-living), keeping the labels in a stable order. */
export function labelQuestion<L extends string>(rng: Rng, q: { prompt: RichText; labels: Record<L, string>; answer: L; why: RichText; wrongWhy?: (chosen: L) => RichText; code: MistakeCode; hint: RichText }): GeneratedQuestion {
  const keys = Object.keys(q.labels) as L[];
  const opts = keys.map((k) => ({ id: k, text: q.labels[k] }));
  return choice(rng, {
    prompt: q.prompt,
    correct: opts.find((o) => o.id === q.answer)!,
    distractors: opts.filter((o) => o.id !== q.answer).map((o) => ({ ...o, feedback: q.wrongWhy ? q.wrongWhy(o.id as L) : q.why })),
    keepOrder: opts,
    code: q.code,
    hints: [q.hint],
    solution: [q.why],
  });
}
