/** For grown-ups: choose and test the voice children hear on this device. */
import { useEffect, useState } from 'react';
import { Button } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { speechSupported, voicesFor, voiceFor, chosenVoiceName, chooseVoice, onVoiceChange, speak, voiceScore } from './speech.ts';

const SAMPLE = 'Hello! Let’s count together: 1, 2, 3. What is 3 + 4? Yes, it’s 7. Well done!';

export function VoicePicker({ lang = 'en' }: { lang?: string }) {
  const [, setTick] = useState(0);
  useEffect(() => onVoiceChange(() => setTick((x) => x + 1)), []);
  if (!speechSupported()) return <p className="muted">This browser can’t speak, so children won’t hear questions read aloud here. Try Chrome or Edge.</p>;
  const list = voicesFor(lang);
  const best = voiceFor(lang);
  const natural = (v: SpeechSynthesisVoice) => (voiceScore(v, lang) ?? 0) >= 50;
  return (
    <div className="field voice-pick">
      <label htmlFor="voice-pick">Voice on this device</label>
      <div className="voice-pick-row">
        <select id="voice-pick" value={chosenVoiceName() ?? ''} onChange={(e) => chooseVoice(e.target.value || null)}>
          <option value="">Best available{best && !chosenVoiceName() ? ` (${best.name})` : ''}</option>
          {list.map((v) => (
            <option key={v.voiceURI} value={v.name}>
              {v.name}
              {natural(v) ? ', natural' : ''}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={() => void speak(SAMPLE, lang, { force: true })}>
          <Icon name="speaker" />
          Listen
        </Button>
      </div>
      <p className="field-hint">
        {list.some(natural)
          ? 'Voices marked natural sound most like a person.'
          : 'This device only has basic voices, which sound robotic. Microsoft Edge usually offers natural voices, including South African English; on Android, update Speech Services by Google.'}
      </p>
    </div>
  );
}
