/**
 * The voice. Every Junior prompt is spoken, because many Grade 1s cannot read yet.
 * Uses the device's own speech synthesis (free, offline, instant). Voices differ by device; South African
 * languages other than English and Afrikaans rarely have a device voice, so we fall back to an English
 * voice and say so to adults (see LanguageNote). Recorded voices can replace this later behind the same API.
 */
import { languageOf } from '../../../shared/junior/languages.ts';

const KEY = 'ml_voice_on';
let enabled = (() => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
})();
let voices: SpeechSynthesisVoice[] = [];
const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const listeners = new Set<() => void>();

function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices();
  listeners.forEach((l) => l());
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

export const speechSupported = (): boolean => !!synth;
export const voiceEnabled = (): boolean => enabled && !!synth;
export function setVoiceEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // private mode: the setting lasts for this visit only
  }
  if (!on) synth?.cancel();
  listeners.forEach((l) => l());
}
export function onVoiceChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The best voice for a language: exact (en-ZA), then the same language (en-GB), else null. */
export function voiceFor(lang: string): SpeechSynthesisVoice | null {
  const bcp = languageOf(lang).bcp47.toLowerCase();
  const base = bcp.split('-')[0]!;
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
  return voices.find((v) => norm(v) === bcp) ?? voices.find((v) => norm(v).split('-')[0] === base && /female|natural|google/i.test(v.name)) ?? voices.find((v) => norm(v).split('-')[0] === base) ?? null;
}

/** Make written maths sayable: "8 − 3" → "8 minus 3", "R5" → "5 rand". */
export function sayable(text: string): string {
  return text
    .replace(/(\d)\s*−\s*(\d)/g, '$1 minus $2')
    .replace(/−/g, 'minus ')
    .replace(/(\d)\s*×\s*(\d)/g, '$1 times $2')
    .replace(/(\d)\s*÷\s*(\d)/g, '$1 divided by $2')
    .replace(/\bR(\d+),(\d\d)\b/g, '$1 rand $2')
    .replace(/\bR(\d+)\b/g, '$1 rand')
    .replace(/\b(\d+)c\b/g, '$1 cents')
    .replace(/(\d) (\d{3})\b/g, '$1$2')
    .replace(/_+/g, ' something ')
    .replace(/[“”]/g, '"');
}

let current: SpeechSynthesisUtterance | null = null;

/** Speak now, replacing anything already being said. Resolves when finished (or immediately if off). */
export function speak(text: string, lang = 'en', opts: { rate?: number } = {}): Promise<void> {
  if (!synth || !enabled || !text.trim()) return Promise.resolve();
  synth.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(sayable(text));
    const v = voiceFor(lang) ?? voiceFor('en');
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else u.lang = languageOf(lang).bcp47;
    u.rate = opts.rate ?? 0.92; // a little slower for young listeners
    u.onend = () => resolve();
    u.onerror = () => resolve();
    current = u;
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  synth?.cancel();
  current = null;
}
export const isSpeaking = (): boolean => !!synth?.speaking && !!current;
