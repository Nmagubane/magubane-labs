import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { api, ApiError } from '../../lib/api.ts';
import { Link, useRouter } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, PageHeader, TextInput } from '../../ui/primitives.tsx';
import { inDays } from '../../lib/format.ts';
import type { ExamDto, CatalogueResponse } from '../../../shared/api.ts';
import { EXAM_MAX_DAYS, addDays, examDateProblem, isoDay } from '../../../shared/exam-dates.ts';

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
  // The date rule is shown as soon as a date is picked, and again if the form is sent without one.
  const [dateTouched, setDateTouched] = useState(false);
  const [skillsError, setSkillsError] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const subject = cat.data?.subjects.find((s) => s.id === subjectId);
  const skills = useMemo(() => subject?.topics.flatMap((t) => t.skills.map((k) => ({ ...k, topic: t.name }))) ?? [], [subject]);
  const inBand = skills.filter((k) => k.inScope);
  const selected = picked ?? new Set((inBand.length ? inBand : skills).map((k) => k.skillId));
  const today = new Date();
  const tomorrow = isoDay(addDays(today, 1));
  const lastDay = isoDay(addDays(today, EXAM_MAX_DAYS));
  const dateProblem = examDateProblem(date, today);

  if ((exams.loading && !exams.data) || (cat.loading && !cat.data)) return <Loading />;
  if (exams.error && !exams.data) return <ErrorState error={exams.error} onRetry={() => void exams.reload()} />;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDateTouched(true);
    setSkillsError(selected.size === 0);
    if (dateProblem) {
      dateRef.current?.focus();
      return;
    }
    if (selected.size === 0) return;
    setBusy(true);
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
        <form onSubmit={create} className="form" noValidate>
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
            <TextInput
              ref={dateRef}
              label="Date"
              type="date"
              className="field-date"
              min={tomorrow}
              max={lastDay}
              value={date}
              onChange={(e) => (setDate(e.target.value), setDateTouched(true))}
              hint="From tomorrow to a year from now."
              error={dateTouched ? dateProblem : null}
              required
            />
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
                        if (next.size) setSkillsError(false);
                      }}
                    />
                    <span>
                      {k.name} <span className="muted small">{k.topic}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {skillsError ? (
              <p className="field-msg" role="alert">
                Tick at least one skill that will be in the exam.
              </p>
            ) : null}
          </fieldset>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" busy={busy}>
            Add exam and build my plan
          </Button>
        </form>
      </section>
    </div>
  );
}
