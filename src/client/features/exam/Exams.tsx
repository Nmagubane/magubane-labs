import { useMemo, useState, type FormEvent } from 'react';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { api, ApiError } from '../../lib/api.ts';
import { Link, useRouter } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, PageHeader, TextInput } from '../../ui/primitives.tsx';
import { inDays } from '../../lib/format.ts';
import type { ExamDto, CatalogueResponse } from '../../../shared/api.ts';

export function Exams() {
  const exams = useResource<ExamDto[]>('/api/exams');
  const cat = useResource<CatalogueResponse>('/api/catalogue');
  const { navigate } = useRouter();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string>('mathematics');
  const [date, setDate] = useState('');
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subject = cat.data?.subjects.find((s) => s.id === subjectId);
  const skills = useMemo(() => subject?.topics.flatMap((t) => t.skills.map((k) => ({ ...k, topic: t.name }))) ?? [], [subject]);
  const inBand = skills.filter((k) => k.inScope);
  const selected = picked ?? new Set((inBand.length ? inBand : skills).map((k) => k.skillId));
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  if ((exams.loading && !exams.data) || (cat.loading && !cat.data)) return <Loading />;
  if (exams.error && !exams.data) return <ErrorState error={exams.error} onRetry={() => void exams.reload()} />;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ex = await api.post<ExamDto>('/api/exams', { title: title || `${subject?.name ?? ''} exam`, subjectId, examDate: date, skillIds: [...selected] });
      invalidate('/api/exams', '/api/home');
      navigate(`/exams/${ex.id}`);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="exams">
      <PageHeader title="Exam readiness" lead="Add a test or exam. You'll get an honest readiness estimate and a day-by-day plan that changes as you improve." />
      {exams.data?.length ? (
        <ul className="rows exam-rows">
          {exams.data.map((e) => (
            <li key={e.id}>
              <Link to={`/exams/${e.id}`} className="row">
                <span className="row-main">
                  <span className="row-title">{e.title}</span>
                  <span className="row-sub">
                    {new Date(`${e.examDate}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}, {e.daysLeft >= 0 ? inDays(e.daysLeft) : 'finished'}
                  </span>
                </span>
                <span className="row-end num">{e.readiness}% ready</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="sheet exam-form" aria-labelledby="add-exam">
        <h2 id="add-exam" className="sheet-title">
          Add an exam
        </h2>
        <form onSubmit={create} className="form">
          <div className="form-row">
            <TextInput label="Name" placeholder="e.g. Maths June exam" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            <div className="field">
              <label htmlFor="exam-subject">Subject</label>
              <select id="exam-subject" value={subjectId} onChange={(e) => (setSubjectId(e.target.value), setPicked(null))}>
                {cat.data?.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <TextInput label="Date" type="date" min={tomorrow} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <fieldset className="skill-pick">
            <legend>What will be in it?</legend>
            <p className="muted small">Your grade&apos;s skills are ticked. Untick anything your teacher said won&apos;t be examined.</p>
            <ul>
              {skills.map((k) => (
                <li key={k.skillId}>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={selected.has(k.skillId)}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(k.skillId)) next.delete(k.skillId);
                        else next.add(k.skillId);
                        setPicked(next);
                      }}
                    />
                    <span>
                      {k.name} <span className="muted small">{k.topic}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" busy={busy} disabled={!date || selected.size === 0}>
            Add exam and build my plan
          </Button>
        </form>
      </section>
    </div>
  );
}
