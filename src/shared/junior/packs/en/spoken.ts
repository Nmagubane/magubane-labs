/**
 * How written Junior text is said aloud in South African English.
 *
 * The screen shows maths the way it is written ("3 + 4 = 7", "12:05", "R12,50", "c-a-t"); a speech
 * engine reading that literally sounds like a calculator. This turns it into what a Foundation Phase
 * teacher would say: "3 plus 4 is 7", "five past twelve", "12 rand 50", "c, a, t".
 *
 * TRANSLATORS: each language needs its own version of this file; the rules are about how people speak,
 * so they don't translate word for word.
 */
import { numberWords } from './core.ts';

const DENOMS: Record<number, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['quarter', 'quarters'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  8: ['eighth', 'eighths'],
  10: ['tenth', 'tenths'],
};

function fractionWords(n: number, d: number): string | null {
  const name = DENOMS[d];
  if (!name || n < 1 || n > 10) return null;
  return `${numberWords(n)} ${n === 1 ? name[0] : name[1]}`;
}

/** "12:05" → "five past twelve". Foundation Phase reads clocks in past/to. */
function clockWords(h: number, m: number): string {
  const hour = (x: number) => numberWords(((x - 1 + 12) % 12) + 1);
  if (m === 0) return `${hour(h)} o'clock`;
  if (m === 15) return `quarter past ${hour(h)}`;
  if (m === 30) return `half past ${hour(h)}`;
  if (m === 45) return `quarter to ${hour(h + 1)}`;
  const mins = (x: number) => (x % 5 === 0 ? numberWords(x) : `${numberWords(x)} ${x === 1 ? 'minute' : 'minutes'}`);
  return m < 30 ? `${mins(m)} past ${hour(h)}` : `${mins(60 - m)} to ${hour(h + 1)}`;
}

const KEEP_CAPS = new Set(['SA', 'TV', 'OK', 'DNA']);
const NUM = String.raw`\d+`;
/** What can sit before an operator: a number, "what", or an amount already turned into "12 rand"/"50 cents". */
const LEFT = String.raw`\d+|what|rand|cents?`;

export function spokenEn(input: string): string {
  let t = ` ${input} `;

  // Typography the voice shouldn't read: curly quotes, quote marks around words, arrows.
  t = t.replace(/(\p{L})[’'](\p{L})/gu, "$1'$2"); // keep apostrophes inside words
  t = t.replace(/[“”"‘’]/g, '');
  t = t.replace(/\s*→\s*/g, ', then ');
  t = t.replace(/&/g, ' and ');

  // Numbers written with a thousands space: "1 000".
  t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2');

  // Money: R12,50 → 12 rand 50; R12 → 12 rand; 50c → 50 cents.
  t = t.replace(/\bR(\d+),(\d\d)\b/g, (_, r: string, c: string) => `${r} rand ${Number(c)}`);
  t = t.replace(/\bR(\d+)\b/g, '$1 rand');
  t = t.replace(/\b(\d+)c\b/g, (_, c: string) => `${c} ${c === '1' ? 'cent' : 'cents'}`);

  // Clock times.
  t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (all, h: string, m: string) => (Number(h) <= 24 && Number(m) < 60 ? clockWords(Number(h), Number(m)) : all));

  // Fractions: 3/4 → three quarters.
  t = t.replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (all, n: string, d: string) => fractionWords(Number(n), Number(d)) ?? all);

  // Blanks: drop the "_ _ _" that only shows letter slots; any other blank is a "gap".
  t = t.replace(/:\s*(?:_+\s*)+(?=[.!?]|\s*$)/g, '');
  t = t.replace(/\s+_+\s*$/g, ' ');
  t = t.replace(/_+/g, ' a gap ');

  // Sound-outs: c-a-t, m-oo-n, s - u - n, c… a… t → "c, a, t".
  t = t.replace(/\b\p{Ll}{1,3}(?:\s?[-–…]\s?\p{Ll}{1,3}){1,7}\b/gu, (m) => {
    const parts = m.split(/\s?[-–…]\s?/);
    // Only treat it as a sound-out when the pieces are sound-sized: "forty-six" and "plant-eaters" stay words.
    return parts.every((p) => p.length <= 3) && parts.length >= 2 ? parts.join(', ') : m;
  });
  t = t.replace(/(\p{Ll})…\s*/gu, '$1, ');
  t = t.replace(/…/g, ', ');

  // Arithmetic. A "?" standing in for a number is "what".
  t = t.replace(new RegExp(String.raw`([=+×÷−-]\s*)\?`, 'g'), '$1what');
  t = t.replace(new RegExp(String.raw`\?(\s*[=+×÷−])`, 'g'), 'what$1');
  t = t.replace(new RegExp(String.raw`(${LEFT})\s*[−-]\s*(?=${NUM}|what)`, 'g'), '$1 take away ');
  t = t.replace(/−\s*/g, 'take away ');
  t = t.replace(new RegExp(String.raw`(${LEFT})\s*\+\s*(?=${NUM}|what)`, 'g'), '$1 plus ');
  t = t.replace(/\s*\+\s*/g, ' and ');
  t = t.replace(/\s*×\s*/g, ' times ');
  t = t.replace(/\s*÷\s*/g, ' shared by ');
  t = t.replace(/\s*=\s*/g, ' is ');

  // Bracketed asides become a spoken aside.
  // "a ball (sphere)" → "a ball, or sphere"; longer asides just get a pause either side.
  t = t.replace(/\s*\(\s*(\p{L}+)\s*\)/gu, ', or $1,');
  t = t.replace(/\s*\(\s*/g, ', ').replace(/\s*\)\s*/g, ', ');

  // Shouted words (NOT) would be spelt out by some voices.
  t = t.replace(/\b\p{Lu}{2,}\b/gu, (w) => (KEEP_CAPS.has(w) ? w : w.toLowerCase()));

  // South African English says "one hundred and five"; American voices drop the "and".
  t = t.replace(/\b\d{3,4}\b/g, (n) => (Number(n) >= 100 && Number(n) <= 1000 ? numberWords(Number(n)) : n));

  // Tidy the punctuation the rules above leave behind.
  t = t
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/,\s*([,.!?;:])/g, '$1')
    .replace(/([.!?])\s*,/g, '$1')
    .replace(/^[\s,]+/, '')
    .trim();
  return t;
}
