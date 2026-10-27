import { useMemo, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { Button, Segmented, TextInput } from '../../ui/primitives.tsx';
import type { CatalogueResponse } from '../../../shared/api.ts';
import { FOUNDATION_SUBJECTS, topicsInSubject, skillsInTopic, getSubject } from '../../../shared/curriculum/catalogue.ts';
import type { AssignmentDto, ClassSummaryDto } from '../../../shared/api-teach.ts';

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Set work for a class. On a class page, `classId` is fixed and the skill is chosen;
 * on a lesson page, `skillId` is fixed and the class is chosen.
 */
export function AssignForm({ classId, skillId, subjectId, grade, compact = false, onDone }: { classId?: string; skillId?: string; subjectId?: string; grade?: number; compact?: boolean; onDone?: (a: AssignmentDto) => void }) {
  // Grades 1–3 practise Foundation Phase skills (no written lessons, no timed tests for young children).
  const junior = grade !== undefined && grade <= 3;
  const classes = useResource<ClassSummaryDto[]>(classId ? null : '/api/teach/classes');
  const cat = useResource<CatalogueResponse>(skillId || junior ? null : '/api/catalogue');
  const [cls, setCls] = useState<string>(classId ?? '');
  const [skill, setSkill] = useState<string>(skillId ?? '');
  const [kind, setKind] = useState<'lesson' | 'practice' | 'test'>('practice');
  const [due, setDue] = useState(() => isoDay(new Date(Date.now() + 7 * 86_400_000)));
  const [count, setCount] = useState('8');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const active = (classes.data ?? []).filter((c) => !c.archived);
  const chosenClass = classId ?? cls;
  const groups = useMemo(() => {
    if (junior)
      return FOUNDATION_SUBJECTS.filter((sid) => !subjectId || subjectId === 'all' || subjectId === sid).flatMap((sid) =>
        topicsInSubject(sid).map((t) => ({ label: `${getSubject(sid)?.name}: ${t.name}`, skills: skillsInTopic(t.id).filter((k) => k.grade === grade).map((k) => ({ id: k.id, name: k.name })) })).filter((g) => g.skills.length),
      );
    const subj = cat.data?.subjects ?? [];
    const ordered = subjectId ? [...subj.filter((s) => s.id === subjectId), ...subj.filter((s) => s.id !== subjectId)] : subj;
    return ordered.flatMap((s) => s.topics.map((t) => ({ label: `${s.name}: ${t.name}`, skills: t.skills.map((k) => ({ id: k.skillId, name: `${k.name} (Gr ${k.grade})` })) })));
  }, [cat.data, subjectId, junior, grade]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const a = await api.post<AssignmentDto>(`/api/teach/classes/${chosenClass}/assignments`, { kind, skillId: skill, dueAt: due, ...(kind !== 'lesson' ? { questionCount: Number(count) } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      invalidate('/api/teach');
      setMsg({ ok: true, text: `Assigned: ${a.title}, due ${due}.` });
      setNote('');
      onDone?.(a);
    } catch (err) {
      setMsg({ ok: false, text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  };

  if (!classId && classes.data && !active.length) return <p className="muted">Create a class first, then you can assign this.</p>;

  return (
    <form onSubmit={submit} className={`form assign-form${compact ? ' compact' : ''}`} noValidate>
      {!classId ? (
        <div className="field">
          <label htmlFor="assign-class">Class</label>
          <select id="assign-class" value={cls} onChange={(e) => setCls(e.target.value)} required>
            <option value="">Choose a class</option>
            {active.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {!skillId ? (
        <div className="field">
          <label htmlFor="assign-skill">Skill</label>
          <select id="assign-skill" value={skill} onChange={(e) => setSkill(e.target.value)} required>
            <option value="">Choose a skill</option>
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.skills.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      ) : null}
      <div className="field">
        <span className="field-label" id="assign-kind">
          What should they do?
        </span>
        {junior ? null : <Segmented label="Assignment type" value={kind} onChange={setKind} options={[{ value: 'lesson', label: 'Lesson' }, { value: 'practice', label: 'Practice' }, { value: 'test', label: 'Test' }]} />}
        <p className="field-hint">{junior ? 'Short spoken practice with materials to touch, 5 questions at a time. It appears on the child’s home screen.' : kind === 'lesson' ? 'The lesson with its labs and checks.' : kind === 'practice' ? 'Adaptive practice with hints and feedback.' : 'A timed test: no hints, tutor locked until they submit.'}</p>
      </div>
      <div className="assign-row">
        <TextInput label="Due" type="date" value={due} min={isoDay(new Date())} onChange={(e) => setDue(e.target.value)} required />
        {kind !== 'lesson' ? (
          <div className="field">
            <label htmlFor="assign-count">Questions</label>
            <select id="assign-count" value={count} onChange={(e) => setCount(e.target.value)}>
              {['5', '8', '10', '12', '15'].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {!compact ? <TextInput label="Note for learners (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="e.g. Show your working for every question" /> : null}
      {msg ? (
        <p className={msg.ok ? 'note note-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>
          {msg.text}
        </p>
      ) : null}
      <Button type="submit" busy={busy} disabled={!chosenClass || !skill || !due}>
        Assign
      </Button>
    </form>
  );
}
