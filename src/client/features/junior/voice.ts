import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session.tsx';
import { instructionLanguage } from '../../../shared/junior/languages.ts';
import { speak, voiceEnabled, onVoiceChange, setVoiceEnabled } from './speech.ts';

/** Speak in the child's instruction language. */
export function useSpeak(): (text: string) => Promise<void> {
  const { me } = useSession();
  const lang = instructionLanguage(me?.profile?.homeLanguage ?? 'en');
  return useCallback((text: string) => speak(text, lang), [lang]);
}

export function useVoiceToggle(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(voiceEnabled());
  useEffect(() => onVoiceChange(() => setOn(voiceEnabled())), []);
  return [on, setVoiceEnabled];
}
