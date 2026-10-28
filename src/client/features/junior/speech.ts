/**
 * The voice. Every Junior prompt is spoken, because many Grade 1s cannot read yet.
 *
 * Uses the device's own speech synthesis (free, offline, instant). Two things decide whether it sounds
 * like a person or a robot:
 *  - the words: text goes through toSpoken() ("3 + 4 = 7" → "3 plus 4 is 7") and is spoken a sentence
 *    at a time, so it pauses where a person would;
 *  - the voice: devices ship several, and the first one is often an old robotic one. We rank them
 *    (natural/neural voices first, South African English first) and let an adult pick for the device.
 * Recorded voices can replace this later behind the same speak() call.
 */
import { languageOf } from '../../../shared/junior/languages.ts';
import { spokenChunks } from '../../../shared/junior/spoken.ts';

const KEY = 'ml_voice_on';
const VOICE_KEY = 'ml_voice_name';
const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    // private mode: the setting lasts for this visit only
  }
};

let enabled = read(KEY) !== '0';
let chosen = read(VOICE_KEY);
let voices: SpeechSynthesisVoice[] = [];
const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices();
  notify();
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

export const speechSupported = (): boolean => !!synth;
export const voiceEnabled = (): boolean => enabled && !!synth;
export function setVoiceEnabled(on: boolean): void {
  enabled = on;
  write(KEY, on ? '1' : '0');
  if (!on) stopSpeaking();
  notify();
}
export function onVoiceChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
const NATURAL = /natural|neural|online|premium|enhanced|siri/i;
// Novelty and low-quality voices that ship with some systems.
const AVOID = /compact|espeak|zarvox|trinoids|bells|bad news|good news|bahh|boing|bubbles|cellos|deranged|hysterical|jester|organ|superstar|whisper|albert|fred|junior|ralph|kathy|bruce|agnes|princess|wobble/i;
// Accents closest to South African English, when there's no en-ZA voice.
const NEAR_EN = ['en-gb', 'en-ie', 'en-au', 'en-nz'];

/** Higher is better; null means the voice doesn't speak this language. */
export function voiceScore(v: SpeechSynthesisVoice, lang: string): number | null {
  const bcp = languageOf(lang).bcp47.toLowerCase();
  const base = bcp.split('-')[0]!;
  const l = norm(v);
  if (l.split('-')[0] !== base) return null;
  let s = 0;
  if (l === bcp) s += 30;
  else if (base === 'en' && NEAR_EN.includes(l)) s += 15;
  else if (l === 'en-us') s += 8;
  if (NATURAL.test(v.name)) s += 50;
  else if (/google/i.test(v.name)) s += 35;
  if (AVOID.test(v.name)) s -= 100;
  return s;
}

/** Voices for a language, best first. */
export function voicesFor(lang: string): SpeechSynthesisVoice[] {
  return voices
    .map((v) => ({ v, s: voiceScore(v, lang) }))
    .filter((x): x is { v: SpeechSynthesisVoice; s: number } => x.s !== null)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
}

/** The voice to use: the adult's choice for this device if it speaks this language, else the best ranked. */
export function voiceFor(lang: string): SpeechSynthesisVoice | null {
  const ranked = voicesFor(lang);
  return (chosen ? ranked.find((v) => v.name === chosen) : undefined) ?? ranked[0] ?? null;
}

export const chosenVoiceName = (): string | null => chosen;
export function chooseVoice(name: string | null): void {
  chosen = name;
  write(VOICE_KEY, name);
  notify();
}

let generation = 0;

/**
 * Speak now, replacing anything already being said. Text is spoken a sentence at a time.
 * Resolves when finished, interrupted, or immediately if the voice is off.
 */
export function speak(text: string, lang = 'en', opts: { force?: boolean } = {}): Promise<void> {
  if (!synth || (!enabled && !opts.force) || !text.trim()) return Promise.resolve();
  synth.cancel();
  const my = ++generation;
  const chunks = spokenChunks(text, lang);
  const v = voiceFor(lang) ?? voiceFor('en');
  // Natural voices already have good pacing; the older ones sound better a touch slower and brighter.
  const natural = !!v && (NATURAL.test(v.name) || /google/i.test(v.name));
  return new Promise((resolve) => {
    let left = chunks.length;
    if (!left) return resolve();
    for (const chunk of chunks) {
      const u = new SpeechSynthesisUtterance(chunk);
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else u.lang = languageOf(lang).bcp47;
      u.rate = natural ? 0.95 : 0.88;
      u.pitch = natural ? 1 : 1.08;
      const finish = () => {
        left -= 1;
        if (left <= 0 || my !== generation) resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
    }
  });
}

export function stopSpeaking(): void {
  generation += 1;
  synth?.cancel();
}
export const isSpeaking = (): boolean => !!synth?.speaking;
