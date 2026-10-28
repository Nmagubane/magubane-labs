/**
 * What the voice actually says. Written text goes through the instruction language's spoken rules
 * (packs/<lang>/spoken.ts), then is cut into sentence-sized pieces so the voice pauses where a person would.
 */
import { spokenEn } from './packs/en/spoken.ts';

const RULES: Record<string, (t: string) => string> = { en: spokenEn };

/** Text as it should be spoken in `lang` (falls back to English rules, the only live pack). */
export function toSpoken(text: string, lang = 'en'): string {
  return (RULES[lang] ?? spokenEn)(text);
}

/** Sentence-sized pieces. Each becomes its own utterance: natural pauses, and long stories don't get cut off. */
export function spokenChunks(text: string, lang = 'en'): string[] {
  const s = toSpoken(text, lang);
  if (!s) return [];
  const parts = s.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [s];
  const out: string[] = [];
  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    // Very short bits ("Yes!") ride with the next sentence so the voice doesn't stutter.
    const prev = out[out.length - 1];
    if (prev && prev.split(' ').length <= 1) out[out.length - 1] = `${prev} ${p}`;
    else out.push(p);
  }
  return out;
}
