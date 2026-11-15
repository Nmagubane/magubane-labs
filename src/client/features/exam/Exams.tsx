import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { api, ApiError } from '../../lib/api.ts';
import { Link, useRouter } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, PageHeader, TextInput } from '../../ui/primitives.tsx';
import { inDays } from '../../lib/format.ts';
import type { ExamDto } from '../../../shared/api.ts';
import type { ExamOption, ExamOptionSkill } from '../../../shared/curriculum/papers.ts';
import { EXAM_MAX_DAYS, addDays, examDateProblem, isoDay } from '../../../shared/exam-dates.ts';

/** Skills grouped by topic, in the order they first appear. */
function byTopic(skills: ExamOptionSkill[]): { topicId: string; topicName: string; skills: ExamOptionSkill[] }[] {
  const groups = new Map<string, { topicId: string; topicName: string; skills: ExamOptionSkill[] }>();
  for (const s of skills) {
    const g = groups.get(s.topicId) ?? { topicId: s.topicId, topicName: s.topicName, skills: [] };
    g.skills.push(s);
    groups.set(s.topicId, g);
  }
  return [...groups.values()];
}

export function Exams() {
  const exams = useResource<ExamDto[]>('/api/exams');
  const options = useResource<ExamOption[]>('/api/exams/options');
  const { navigate } = useRouter();
  const [title, setTitle] = useState('');
  const [optionId, setOptionId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The date rule is shown as soon as a date is picked, and again if the form is sent without one.
  const [dateTouched, setDateTouched] = useState(false);
  const [skillsError, setSkillsError] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const option = options.data?.find((o) => o.id === optionId) ?? options.data?.[0];
  const selected = useMemo(() => picked ?? new Set(option?.skills.filter((s) => s.ticked).map((s) => s.skillId)), [picked, option]);
  const groups = useMemo(() => byTopic(option?.skills ?? []), [option]);
  const today = new Date();
  const tomorrow = isoDay(addDays(today, 1));
  const lastDay = isoDay(addDays(today, EXAM_MAX_DAYS));
  const dateProblem = examDateProblem(date, today);

  if ((exams.loading && !exams.data) || (options.loading && !options.data)) return <Loading />;
  if (exams.error && !exams.data) return <ErrorState error={exams.error} onRetry={() => void exams.reload()} />;
  if (options.error && !options.data) return <ErrorState error={options.error} onRetry={() => void options.reload()} />;

  const choose = (id: string) => {
    setOptionId(id);
    setPicked(null);
    setSkillsError(false);
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
    if (next.size) setSkillsError(false);
  };
  const setAll = (on: boolean) => {
    setPicked(new Set(on ? option?.skills.map((s) => s.skillId) : []));
    if (on) setSkillsError(false);
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!option) return;
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
      const ex = await api.post<ExamDto>('/api/exams', { title: title.trim() || undefined, optionId: option.id, examDate: date, skillIds: [...selected] });
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
                    {e.label !== e.title ? `${e.label} · ` : ''}
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
        {!option ? (
          <p className="muted">There is nothing to add an exam for yet. Choose your subjects in your account first.</p>
        ) : (
          <form onSubmit={create} className="form" noValidate>
            <div className="form-row">
              <div className="field">
                <label htmlFor="exam-option">What are you writing?</label>
                <select id="exam-option" value={option.id} onChange={(e) => choose(e.target.value)}>
                  {options.data?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <TextInput label="Name (optional)" placeholder={option.label} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
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
              <div className="skill-pick-head">
                <p className="muted small">{option.note}</p>
                <span className="skill-pick-all">
                  <Button type="button" variant="quiet" size="sm" onClick={() => setAll(true)}>
                    Tick all
                  </Button>
                  <Button type="button" variant="quiet" size="sm" onClick={() => setAll(false)}>
                    Untick all
                  </Button>
                </span>
              </div>
              {groups.map((g) => (
                <div key={g.topicId} className="skill-pick-topic">
                  <h3 className="skill-pick-topic-name">{g.topicName}</h3>
                  <ul>
                    {g.skills.map((k) => (
                      <li key={k.skillId}>
                        <label className="check-row">
                          <input type="checkbox" checked={selected.has(k.skillId)} onChange={() => toggle(k.skillId)} />
                          <span>
                            {k.name} <span className="muted small skill-pick-grade">Grade {k.grade}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {skillsError ? (
                <p className="field-msg" role="alert">
                  Tick at least one skill that will be in {option.kind === 'paper' ? option.label : 'it'}.
                </p>
              ) : null}
            </fieldset>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" busy={busy}>
              Add and build my plan
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
