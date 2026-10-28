/**
 * The narrator: what the voice says around each question. Pure functions, so they're tested and the
 * same lines can be shown on screen. `n` is a turn counter that makes the wording vary.
 */
import { TALK, vary } from './packs/en/core.ts';

type Talk = typeof TALK;
const PACKS: Record<string, Talk> = { en: TALK };
const talk = (lang: string): Talk => PACKS[lang] ?? TALK;

const sentences = (s: string): string[] => (s.match(/[^.!?]+[.!?]*/g) ?? []).map((x) => x.trim()).filter(Boolean);
const key = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** An answer short enough to say back ("Yes, it's 11."), not a list or a sorted set. */
function sayableAnswer(answer: string): string | null {
  const a = answer.trim();
  // Lists and sentences are not said back; R12,50 and 12:05 are fine.
  if (!a || a.split(/\s+/).length > 4 || /[,:;?!.]/.test(a.replace(/(\d)[,:](\d)/g, '$1$2'))) return null;
  return a;
}

export function rightLine(answer: string, n: number, lang = 'en'): string {
  const t = talk(lang);
  const a = sayableAnswer(answer);
  // Letter answers ("sh") sound odd said back on their own: just praise.
  if (!a || /^[a-z]{1,2}$/.test(a)) return vary(t.right, n);
  // Numbers, money and times can be said back in more ways than words can ("Yes, it's 7." but not "Yes, it's cow.").
  const pool = /\d/.test(a) ? [...t.rightWithAnswer, ...t.rightWithNumber] : t.rightWithAnswer;
  return cap(vary(pool, n)(a));
}

export interface WrongLine {
  /** Shown big on screen and said first. */
  opener: string;
  /** What went wrong, without anything the opener already said (shown under the opener). */
  detail: string;
  /** Everything said, in order. */
  spoken: string;
}

/**
 * A wrong answer: a kind opener, what went wrong (the diagnosed misconception), then the working,
 * with nothing said twice. Generators often repeat the feedback inside the solution.
 */
export function wrongLine(feedback: string | null | undefined, solution: string[], n: number, lang = 'en'): WrongLine {
  const t = talk(lang);
  let fb = (feedback ?? '').trim();
  const nearly = /^nearly\b[.!,]?\s*/i.test(fb);
  if (nearly) fb = fb.replace(/^nearly\b[.!,]?\s*/i, '');
  const opener = nearly ? vary(t.nearly, n) : vary(t.notYet, n);
  const said = new Set<string>();
  const fresh = (s: string) => {
    const k = key(s);
    if (!k || said.has(k)) return false;
    said.add(k);
    return true;
  };
  const fbParts = sentences(fb).filter(fresh);
  const working = solution.flatMap(sentences).filter(fresh);
  const parts = [opener, ...fbParts];
  if (working.length) parts.push(vary(t.together, n), ...working);
  return { opener, detail: fbParts.join(' '), spoken: parts.join(' ') };
}

export function hintLine(hint: string, n: number, lang = 'en'): string {
  return `${vary(talk(lang).clue, n)} ${hint}`;
}

export function watchLine(prompt: string, solution: string[], lang = 'en'): string {
  const t = talk(lang);
  return [t.watchStart, prompt, ...solution, t.watchEnd].join(' ');
}

export function doneLine(opts: { name: string; skill: string; right: number; total: number; n: number }, lang = 'en'): { title: string; spoken: string } {
  const t = talk(lang);
  const { name, skill, right, total, n } = opts;
  const result = right === total ? t.doneAll(total, name) : right === 0 ? t.doneNone(total) : t.doneSome(right, total);
  const extra = right === total ? '' : ` ${vary(t.doneEncourage, n)}`;
  return { title: t.doneSkill(skill), spoken: `${result}${extra}` };
}

export function greetingLine(name: string, hour: number, n: number, lang = 'en'): { title: string; spoken: string } {
  const t = talk(lang);
  const title = t.greeting(name, hour);
  return { title, spoken: `${title} ${vary(t.homeAsk, n)}` };
}
