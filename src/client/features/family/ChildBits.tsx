/** Pieces shared by the parent and teacher views of Grade 1–3 children. */
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { Button, TextInput } from '../../ui/primitives.tsx';
import { LANGUAGES, LANGUAGE_STATUS, languageOf, type LanguageCode } from '../../../shared/junior/languages.ts';
import { PICTURES, CODE_LENGTH, pictureOf } from '../../../shared/junior/pictures.ts';
import type { CreatedChildDto } from '../../../shared/api-junior.ts';

/** A child's 3 pictures, big enough to show the child. */
export function PictureCode({ code, size = 'md' }: { code: string[]; size?: 'md' | 'lg' }) {
  return (
    <ol className={`pcode pcode-${size}`} aria-label={`Picture code: ${code.map((c) => pictureOf(c)?.name ?? c).join(', then ')}`}>
      {code.map((c, i) => (
        <li key={i}>
          <span aria-hidden>{pictureOf(c)?.icon}</span>
          <span className="pcode-name">{pictureOf(c)?.name}</span>
        </li>
      ))}
    </ol>
  );
}

export function PictureCodePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="pcode-picker">
      <ol className="pcode pcode-md pcode-slots" aria-label="Chosen pictures">
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <li key={i} className={value[i] ? '' : 'empty'}>
            <span aria-hidden>{value[i] ? pictureOf(value[i])?.icon : ''}</span>
            <span className="pcode-name">{value[i] ? pictureOf(value[i])?.name : `Picture ${i + 1}`}</span>
          </li>
        ))}
      </ol>
      <div className="pcode-grid" role="group" aria-label="Choose 3 pictures in order">
        {PICTURES.map((p) => (
          <button key={p.id} type="button" className="pcode-btn" aria-label={p.name} disabled={value.length >= CODE_LENGTH || value.includes(p.id)} onClick={() => onChange([...value, p.id])}>
            <span aria-hidden>{p.icon}</span>
          </button>
        ))}
      </div>
      {value.length ? (
        <button type="button" className="linklike" onClick={() => onChange([])}>
          Clear and choose again
        </button>
      ) : null}
    </div>
  );
}

export function languageLine(code: LanguageCode): string {
  const l = languageOf(code);
  return LANGUAGE_STATUS[code].instructions === 'live' ? l.name : `${l.name} (instructions in English for now)`;
}

/** Plain words about what a child's home language means today. */
export function LanguageNote({ code, name }: { code: LanguageCode; name?: string }) {
  const st = LANGUAGE_STATUS[code];
  if (st.instructions === 'live' && st.reading === 'live') return null;
  const lang = languageOf(code).name;
  const who = name?.trim();
  return (
    <div className="note lang-note">
      <p>
        <strong>About {lang}:</strong> {who ? `${who}’s instructions are` : 'Instructions are'} spoken and written in English for now, and {who ?? 'the child'} gets English as a First Additional Language as well as Maths and Life Skills.
      </p>
      <p>
        We have not machine-translated {lang}. Children learning to read need words a fluent Foundation Phase teacher has checked, and reading in {lang} is taught differently from English. {lang} goes live as soon as its reviewed pack is ready.
      </p>
    </div>
  );
}

export function AddChildForm({ endpoint, forTeacher, defaultGrade, onCreated }: { endpoint: string; forTeacher: boolean; defaultGrade?: number; onCreated: (c: CreatedChildDto) => void }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number>(defaultGrade ?? 1);
  const [lang, setLang] = useState<LanguageCode>('en');
  const [chooseCode, setChooseCode] = useState(false);
  const [code, setCode] = useState<string[]>([]);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setFieldErr({});
    try {
      const c = await api.post<CreatedChildDto>(endpoint, {
        name,
        grade,
        homeLanguage: lang,
        ...(chooseCode && code.length === CODE_LENGTH ? { pictureCode: code } : {}),
        ...(forTeacher && guardianEmail.trim() ? { guardianEmail } : {}),
        consent: consent || undefined,
      });
      setName('');
      setCode([]);
      setConsent(false);
      setGuardianEmail('');
      onCreated(c);
    } catch (e2) {
      const ae = e2 as ApiError;
      const fe = (ae.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
      if (fe) setFieldErr(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0] ?? ''])));
      else setErr(ae.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="form add-child" onSubmit={submit} noValidate>
      <TextInput label="First name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} error={fieldErr.name} maxLength={30} hint="A first name is enough. It shows on the sign-in screen." required />
      {forTeacher ? null : (
        <fieldset className="seg-field">
          <legend>Grade</legend>
          <div className="segmented" role="radiogroup">
            {[1, 2, 3].map((g) => (
              <button key={g} type="button" role="radio" aria-checked={grade === g} className={grade === g ? 'on' : ''} onClick={() => setGrade(g)}>
                Grade {g}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="field">
        <label htmlFor="ac-lang">Home language</label>
        <select id="ac-lang" value={lang} onChange={(e) => setLang(e.target.value as LanguageCode)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {languageLine(l.code)}
            </option>
          ))}
        </select>
        <p className="field-hint">The language spoken at home. It decides the reading programme and, once reviewed, the language of instructions.</p>
      </div>
      {lang !== 'en' ? <LanguageNote code={lang} name={name} /> : null}
      <fieldset className="seg-field">
        <legend>Picture code</legend>
        <label className="check-row">
          <input type="checkbox" checked={chooseCode} onChange={(e) => setChooseCode(e.target.checked)} />
          <span>I’ll choose the 3 pictures {forTeacher ? '' : 'with my child'} (otherwise we pick 3 for you)</span>
        </label>
        {chooseCode ? <PictureCodePicker value={code} onChange={setCode} /> : null}
      </fieldset>
      {forTeacher ? <TextInput label="Parent or guardian’s email (optional)" type="email" autoComplete="off" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} error={fieldErr.guardianEmail} hint="They get a short weekly progress report." /> : null}
      <label className="check-row consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          {forTeacher ? (
            <>The school has consent from this child’s parent or guardian for them to use Magubane Labs, as described in the <a href="/privacy" target="_blank" rel="noopener">privacy notice</a>.</>
          ) : (
            <>I am this child’s parent or guardian. I have read the <a href="/privacy" target="_blank" rel="noopener">privacy notice</a> and agree to them using Magubane Labs.</>
          )}
        </span>
      </label>
      {fieldErr.consent ? (
        <p className="field-msg" role="alert">
          {fieldErr.consent}
        </p>
      ) : null}
      {err ? (
        <p className="form-error" role="alert">
          {err}
        </p>
      ) : null}
      <Button type="submit" busy={busy} disabled={!name.trim() || !consent || (chooseCode && code.length !== CODE_LENGTH)}>
        Add child
      </Button>
    </form>
  );
}
