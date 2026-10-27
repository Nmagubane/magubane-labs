/**
 * South Africa's spoken official languages. (South African Sign Language is the twelfth official
 * language; it needs signed video, not a voice, and is not covered by this layer.)
 *
 * A language is 'live' only when its Junior pack exists and a fluent Foundation Phase teacher has
 * reviewed it. Children never see machine-written or unreviewed text in a language they are learning
 * to read: until then, instructions fall back to English and adults are told so plainly.
 */
export const LANGUAGE_CODES = ['en', 'af', 'zu', 'xh', 'nso', 'st', 'tn', 'ss', 've', 'ts', 'nr'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export interface Language {
  code: LanguageCode;
  /** In English, for adults choosing. */
  name: string;
  /** The language's own name for itself. */
  nativeName: string;
  /** For speech synthesis voices and the html lang attribute. */
  bcp47: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', bcp47: 'en-ZA' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', bcp47: 'af-ZA' },
  { code: 'zu', name: 'isiZulu', nativeName: 'isiZulu', bcp47: 'zu-ZA' },
  { code: 'xh', name: 'isiXhosa', nativeName: 'isiXhosa', bcp47: 'xh-ZA' },
  { code: 'nso', name: 'Sepedi', nativeName: 'Sesotho sa Leboa', bcp47: 'nso-ZA' },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho', bcp47: 'st-ZA' },
  { code: 'tn', name: 'Setswana', nativeName: 'Setswana', bcp47: 'tn-ZA' },
  { code: 'ss', name: 'siSwati', nativeName: 'siSwati', bcp47: 'ss-ZA' },
  { code: 've', name: 'Tshivenda', nativeName: 'Tshivenḓa', bcp47: 've-ZA' },
  { code: 'ts', name: 'Xitsonga', nativeName: 'Xitsonga', bcp47: 'ts-ZA' },
  { code: 'nr', name: 'isiNdebele', nativeName: 'isiNdebele', bcp47: 'nr-ZA' },
];

export const isLanguageCode = (c: string): c is LanguageCode => (LANGUAGE_CODES as readonly string[]).includes(c);
export const languageOf = (c: string): Language => LANGUAGES.find((l) => l.code === c) ?? (LANGUAGES[0] as Language);

/**
 * What exists for each language. Updated by hand when a reviewed pack lands.
 * - instructions: the Junior screens and every activity's spoken and written instructions.
 * - reading: a Home Language phonics and reading pack (sounds, words, stories) for that language.
 * Each language teaches reading differently (isiZulu is taught through syllables, English through
 * letter sounds), so a reading pack is written for its language, never translated from another.
 */
export const LANGUAGE_STATUS: Record<LanguageCode, { instructions: 'live' | 'needed'; reading: 'live' | 'needed' }> = {
  en: { instructions: 'live', reading: 'live' },
  af: { instructions: 'needed', reading: 'needed' },
  zu: { instructions: 'needed', reading: 'needed' },
  xh: { instructions: 'needed', reading: 'needed' },
  nso: { instructions: 'needed', reading: 'needed' },
  st: { instructions: 'needed', reading: 'needed' },
  tn: { instructions: 'needed', reading: 'needed' },
  ss: { instructions: 'needed', reading: 'needed' },
  ve: { instructions: 'needed', reading: 'needed' },
  ts: { instructions: 'needed', reading: 'needed' },
  nr: { instructions: 'needed', reading: 'needed' },
};

/** The language a child's instructions are actually shown and spoken in. */
export function instructionLanguage(homeLanguage: LanguageCode): LanguageCode {
  return LANGUAGE_STATUS[homeLanguage].instructions === 'live' ? homeLanguage : 'en';
}

/** Home Language reading is only offered when a reviewed reading pack exists for that language. */
export const hasReadingPack = (homeLanguage: LanguageCode): boolean => LANGUAGE_STATUS[homeLanguage].reading === 'live';

/**
 * Which Junior subjects a child gets. English First Additional Language is for children whose home
 * language is not English (CAPS: most South African children learn English as an additional language).
 */
export function foundationSubjectsFor(homeLanguage: LanguageCode): ('mathematics' | 'home-language' | 'english-fal' | 'life-skills')[] {
  const out: ('mathematics' | 'home-language' | 'english-fal' | 'life-skills')[] = ['mathematics'];
  if (hasReadingPack(homeLanguage)) out.push('home-language');
  if (homeLanguage !== 'en') out.push('english-fal');
  out.push('life-skills');
  return out;
}
