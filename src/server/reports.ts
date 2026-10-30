/**
 * Progress reports: a learner report (for the learner's guardian and teacher) and a class report (for the teacher),
 * rendered as PDF, downloadable on demand and emailed weekly.
 */
import type { Db } from './db.ts';
import { all, one, run } from './db.ts';
import { HttpError } from './http.ts';
import { config, now } from './config.ts';
import { getProfile, getStates, summarise, localDay } from './learner.ts';
import { progress } from './insights.ts';
import { getUser } from './auth.ts';
import { classDetail, assignmentStatus } from './classes.ts';
import { sendMail, layout } from './mailer.ts';
import { logged } from './verification.ts';
import { unsubscribeUrl, verifySigned } from './links.ts';
import { Pdf, hex, wrap, type RGB } from './pdf.ts';
import type { UserDto } from '../shared/api.ts';
import type { ReportSentDto } from '../shared/api-teach.ts';
import { getSkill } from '../shared/curriculum/catalogue.ts';
import { computeReadiness } from '../shared/mastery/readiness.ts';
import { juniorSkills } from '../shared/junior/recommend.ts';
import { foundationSubjectsFor } from '../shared/junior/languages.ts';
import { listIcan } from './ican.ts';

const INK = hex('#1a1d21');
const INK2 = hex('#4a5159');
const INK3 = hex('#6b737b');
const RULE = hex('#d8dcd5');
const PAPER2 = hex('#f5f6f3');
const PEN = hex('#2347d6');
const TICK = hex('#18804a');
const AMBER = hex('#a86400');
const RED = hex('#c4302b');
const HL = hex('#ffe14d');

const bandColour = (m: number): RGB => (m >= 85 ? TICK : m >= 70 ? PEN : m >= 40 ? hex('#7189ea') : hex('#b3c1f4'));
const fmtDay = (d: Date) => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Johannesburg' });

function header(pdf: Pdf, title: string, subtitle: string, right: string): void {
  pdf.rect(0, 0, 595.28, 92, { fill: PAPER2 });
  pdf.rect(pdf.margin, 26, 22, 22, { stroke: INK, lineWidth: 1.6 });
  pdf.text(pdf.margin + 11, 33, 'Mg', { size: 10, bold: true, align: 'center' });
  pdf.text(pdf.margin + 30, 33, 'Magubane Labs', { size: 11, bold: true });
  pdf.text(595.28 - pdf.margin, 33, right, { size: 9, color: INK2, align: 'right' });
  pdf.text(pdf.margin, 58, title, { size: 18, bold: true });
  pdf.text(pdf.margin, 80, subtitle, { size: 9.5, color: INK2 });
  pdf.y = 112;
}

function section(pdf: Pdf, title: string): void {
  pdf.ensure(48);
  pdf.y += 8;
  pdf.text(pdf.margin, pdf.y, title, { size: 12, bold: true });
  pdf.y += 18;
  pdf.line(pdf.margin, pdf.y - 4, pdf.margin + pdf.width, pdf.y - 4, RULE);
  pdf.y += 4;
}

function tiles(pdf: Pdf, items: { label: string; value: string; note?: string }[]): void {
  pdf.ensure(70);
  const gap = 10;
  const w = (pdf.width - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = pdf.margin + i * (w + gap);
    pdf.rect(x, pdf.y, w, 60, { stroke: RULE, fill: [1, 1, 1] });
    pdf.text(x + 10, pdf.y + 10, it.label, { size: 8, color: INK2 });
    pdf.text(x + 10, pdf.y + 24, it.value, { size: 18, bold: true });
    if (it.note) pdf.text(x + 10, pdf.y + 47, it.note, { size: 7.5, color: INK3 });
  });
  pdf.y += 72;
}

/** A labelled mastery bar row: label | bar | value. */
function barRow(pdf: Pdf, label: string, value: number | null, extra = ''): void {
  pdf.ensure(18);
  const labelW = 210;
  const barW = pdf.width - labelW - 165;
  const name = label.length > 42 ? `${label.slice(0, 40)}…` : label;
  pdf.text(pdf.margin, pdf.y, name, { size: 9.5 });
  const bx = pdf.margin + labelW;
  pdf.rect(bx, pdf.y + 1, barW, 8, { fill: hex('#eceeea') });
  if (value !== null) pdf.rect(bx, pdf.y + 1, Math.max(2, (barW * value) / 100), 8, { fill: bandColour(value) });
  pdf.text(bx + barW + 10, pdf.y, value === null ? 'not started' : `${value}%`, { size: 9.5, bold: value !== null });
  if (extra) pdf.text(pdf.margin + pdf.width, pdf.y, extra, { size: 8.5, color: extra.startsWith('+') ? TICK : extra.startsWith('-') ? RED : INK3, align: 'right' });
  pdf.y += 16;
}

function table(pdf: Pdf, cols: { label: string; w: number; align?: 'left' | 'right' }[], rows: string[][], colour?: (r: number, c: number) => RGB | undefined): void {
  pdf.ensure(36);
  let x = pdf.margin;
  for (const c of cols) {
    pdf.text(c.align === 'right' ? x + c.w - 4 : x, pdf.y, c.label, { size: 8, bold: true, color: INK2, align: c.align === 'right' ? 'right' : 'left' });
    x += c.w;
  }
  pdf.y += 14;
  rows.forEach((r, ri) => {
    pdf.ensure(16);
    if (ri % 2 === 0) pdf.rect(pdf.margin - 4, pdf.y - 3, pdf.width + 8, 15, { fill: PAPER2 });
    let cx = pdf.margin;
    r.forEach((cell, ci) => {
      const c = cols[ci]!;
      const maxChars = Math.floor(c.w / 5.2);
      const txt = cell.length > maxChars ? `${cell.slice(0, maxChars - 1)}…` : cell;
      pdf.text(c.align === 'right' ? cx + c.w - 4 : cx, pdf.y, txt, { size: 8.8, color: colour?.(ri, ci) ?? INK, align: c.align === 'right' ? 'right' : 'left' });
      cx += c.w;
    });
    pdf.y += 15;
  });
  pdf.y += 6;
}

// ---------- learner report ----------

export interface LearnerReportOptions {
  days?: number;
  note?: string | undefined;
  noteFrom?: string | undefined;
}

export function learnerReportPdf(db: Db, learnerId: string, opts: LearnerReportOptions = {}): { pdf: Buffer; name: string; summary: string } {
  const user = getUser(db, learnerId);
  if (!user) throw new HttpError(404, 'not_found', 'That learner does not exist.');
  const profile = getProfile(db, learnerId);
  const at = now();
  const days = opts.days ?? 7;
  const since = new Date(at.getTime() - days * 86_400_000);
  const sinceIso = since.toISOString();
  const states = getStates(db, learnerId);
  const prog = profile ? progress(db, user) : null;
  const classes = all<{ name: string; teacher: string; school: string | null }>(db, 'SELECT c.name, t.display_name AS teacher, t.school FROM class_members m JOIN classes c ON c.id = m.class_id JOIN users t ON t.id = c.teacher_id WHERE m.learner_id = ? AND c.archived_at IS NULL', learnerId);

  const wk = one<{ n: number; c: number | null; ms: number | null }>(db, 'SELECT COUNT(*) AS n, SUM(is_correct) AS c, SUM(time_ms) AS ms FROM responses WHERE user_id = ? AND graded_at >= ? AND skipped = 0', learnerId, sinceIso) ?? { n: 0, c: 0, ms: 0 };
  const dayRows = all<{ graded_at: string }>(db, 'SELECT graded_at FROM responses WHERE user_id = ? AND graded_at >= ? AND skipped = 0', learnerId, sinceIso);
  const activeDays = new Set(dayRows.map((r) => localDay(new Date(r.graded_at)))).size;
  const lessons = one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM lesson_progress WHERE user_id = ? AND completed_at >= ?', learnerId, sinceIso)?.n ?? 0;
  const lessonMs = all<{ started_at: string; completed_at: string }>(db, "SELECT started_at, completed_at FROM activities WHERE user_id = ? AND kind = 'lesson' AND status = 'completed' AND completed_at >= ?", learnerId, sinceIso).reduce((s, r) => s + Math.min(30 * 60000, new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()), 0);
  const minutes = Math.round(((wk.ms ?? 0) + lessonMs) / 60000);
  // Accuracy is first tries only: a Junior "try one like it" second chance is learning, not a score.
  const first = one<{ n: number; c: number | null }>(db, 'SELECT COUNT(*) AS n, SUM(is_correct) AS c FROM responses WHERE user_id = ? AND graded_at >= ? AND skipped = 0 AND question_id NOT IN (SELECT id FROM question_instances WHERE retry_of IS NOT NULL)', learnerId, sinceIso) ?? { n: 0, c: 0 };
  const accuracy = first.n ? Math.round((100 * (first.c ?? 0)) / first.n) : null;

  // Grades 1–3 have no lessons, no tutor and an adult reading the report for them.
  const junior = !!profile && profile.grade <= 3;
  const juniorSets = junior ? (one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM activities WHERE user_id = ? AND status = 'completed' AND completed_at >= ?", learnerId, sinceIso)?.n ?? 0) : 0;
  const juniorTotal = junior && profile ? foundationSubjectsFor(profile.homeLanguage ?? 'en').reduce((n, subj) => n + juniorSkills(subj, profile.grade).length, 0) : 0;
  const skillsStarted = [...states.values()].filter((s) => s.evidence > 0).length;

  const pdf = new Pdf();
  const period = `${fmtDay(since)} to ${fmtDay(at)}`;
  header(pdf, `${user.displayName}'s progress`, `${profile ? `Grade ${profile.grade}. ` : ''}${classes.length ? `${classes.map((c) => `${c.name} (${c.teacher}${c.school ? `, ${c.school}` : ''})`).join('; ')}. ` : ''}Report for ${period}.`, `${days === 7 ? 'Weekly report' : `Last ${days} days`}`);

  tiles(pdf, [
    { label: 'Time learning', value: `${minutes} min`, note: `${activeDays} of ${days} days active` },
    { label: 'Questions answered', value: String(wk.n), note: junior ? `${juniorSets} set${juniorSets === 1 ? '' : 's'} of 5 finished` : `${lessons} lesson${lessons === 1 ? '' : 's'} completed` },
    { label: 'Accuracy', value: accuracy === null ? '–' : `${accuracy}%`, note: 'Correct answers this period' },
    { label: 'Skills started', value: String(skillsStarted), note: junior ? `of ${juniorTotal} for Grade ${profile?.grade}` : prog?.totals.improvement30 != null ? `${prog.totals.improvement30 >= 0 ? '+' : ''}${prog.totals.improvement30} pts in 30 days` : 'Overall' },
  ]);

  if (opts.note) {
    pdf.ensure(60);
    const lines = wrap(opts.note, 9.5, pdf.width - 24).length;
    pdf.rect(pdf.margin, pdf.y, pdf.width, 34 + lines * 13.3, { fill: hex('#fff7cc'), stroke: hex('#e6c93a') });
    pdf.text(pdf.margin + 12, pdf.y + 9, `A note from ${opts.noteFrom ?? 'the teacher'}`, { size: 9, bold: true });
    pdf.y += 24;
    pdf.para(opts.note, { size: 9.5, x: pdf.margin + 12, width: pdf.width - 24 });
    pdf.y += 10;
  }

  // What changed this period
  const worked = all<{ skill_id: string; n: number; c: number }>(db, 'SELECT skill_id, COUNT(*) AS n, SUM(is_correct) AS c FROM responses WHERE user_id = ? AND graded_at >= ? AND skipped = 0 GROUP BY skill_id ORDER BY n DESC', learnerId, sinceIso);
  section(pdf, 'This period');
  if (!worked.length && !lessons) {
    pdf.para(`${user.displayName} didn't practise on Magubane Labs during this period. ${junior ? 'Even 10 minutes on most days makes a real difference at this age.' : 'Even 15 to 20 minutes a few times a week makes a real difference: short, regular practice beats one long session.'}`, { size: 10, color: INK2 });
  } else {
    const snapBefore = (sid: string) => one<{ mastery: number }>(db, 'SELECT mastery FROM mastery_snapshots WHERE user_id = ? AND skill_id = ? AND day < ? ORDER BY day DESC LIMIT 1', learnerId, sid, localDay(since))?.mastery ?? null;
    for (const w of worked.slice(0, 10)) {
      const s = summarise(states.get(w.skill_id), w.skill_id, at);
      const before = snapBefore(w.skill_id);
      const delta = before === null ? null : s.mastery - before;
      barRow(pdf, getSkill(w.skill_id)?.name ?? w.skill_id, s.mastery, `${w.c}/${w.n} correct${delta !== null && delta !== 0 ? `  ${delta > 0 ? '+' : ''}${delta}` : ''}`);
    }
  }

  // "I can…" statements earned this period (Foundation Phase): the plainest answer to "what did they learn?"
  const icanNew = junior ? listIcan(db, learnerId).filter((i) => i.earnedAt >= sinceIso) : [];
  if (icanNew.length) {
    section(pdf, `New things ${user.displayName} can do`);
    for (const i of icanNew.slice(0, 8)) pdf.para(`•  ${i.text}`, { size: 10, gap: 3 });
    if (icanNew.length > 8) pdf.para(`And ${icanNew.length - 8} more on ${user.displayName}'s page.`, { size: 9, color: INK2 });
    pdf.y += 4;
  }

  // Mastery by subject
  if (prog) {
    section(pdf, 'Mastery by topic');
    for (const subj of prog.subjects) {
      pdf.ensure(30);
      pdf.text(pdf.margin, pdf.y, `${subj.name}${subj.mastery !== null ? `: ${subj.mastery}% average` : ''}`, { size: 10, bold: true, color: INK2 });
      pdf.y += 16;
      const topics = subj.topics.filter((t) => t.mastery !== null);
      if (!topics.length) pdf.para('No skills started yet in this subject.', { size: 9, color: INK3 });
      for (const t of topics) barRow(pdf, t.name, t.mastery);
      pdf.y += 4;
    }
  }

  // Strengths and focus
  const started = [...states.values()].filter((s) => s.evidence > 0).map((s) => ({ ...summarise(s, s.skillId, at), name: getSkill(s.skillId)?.name ?? s.skillId }));
  if (started.length) {
    section(pdf, 'Strengths and what to work on next');
    const weak = [...started].filter((s) => s.mastery < 70).sort((a, b) => a.mastery - b.mastery).slice(0, 3);
    // A skill can't be both the strongest and the focus: with one or two skills started, it would be.
    const strong = [...started].filter((s) => !weak.includes(s) && s.mastery >= 40).sort((a, b) => b.mastery - a.mastery).slice(0, 3);
    const colW = (pdf.width - 16) / 2;
    const top = pdf.y;
    pdf.text(pdf.margin, pdf.y, 'Strongest', { size: 9, bold: true, color: TICK });
    pdf.text(pdf.margin + colW + 16, pdf.y, 'Focus next', { size: 9, bold: true, color: AMBER });
    let yl = top + 16;
    if (!strong.length) pdf.text(pdf.margin, yl, 'Early days: nothing is secure yet.', { size: 9.5, color: INK2 });
    for (const s of strong) {
      pdf.text(pdf.margin, yl, `${s.name}: ${s.mastery}%`, { size: 9.5 });
      yl += 15;
    }
    let yr = top + 16;
    if (!weak.length) pdf.text(pdf.margin + colW + 16, yr, 'Everything started is at Proficient or above.', { size: 9.5, color: INK2 });
    for (const s of weak) {
      pdf.text(pdf.margin + colW + 16, yr, `${s.name}: ${s.mastery}%`, { size: 9.5 });
      yr += 15;
    }
    pdf.y = Math.max(yl, yr) + 8;
  }

  // Mistakes
  if (prog?.mistakes.length) {
    section(pdf, 'Mistake patterns (last 30 days)');
    for (const m of prog.mistakes.slice(0, 3)) {
      pdf.ensure(40);
      pdf.text(pdf.margin, pdf.y, `${m.label} (${m.count}×)`, { size: 9.5, bold: true });
      pdf.y += 14;
      pdf.para(`${m.tip} Seen in: ${m.skills.slice(0, 3).join(', ')}.`, { size: 9, color: INK2, gap: 6 });
    }
  }

  // Assignments
  const assigns = all<{ id: string; class_id: string; kind: 'lesson' | 'practice' | 'test'; skill_id: string; title: string; note: string | null; question_count: number | null; due_at: string; created_at: string }>(
    db,
    `SELECT a.* FROM assignments a JOIN class_members m ON m.class_id = a.class_id JOIN classes c ON c.id = a.class_id WHERE m.learner_id = ? AND c.archived_at IS NULL AND a.due_at >= ? ORDER BY a.due_at DESC LIMIT 12`,
    learnerId,
    localDay(new Date(at.getTime() - 21 * 86_400_000)),
  );
  if (assigns.length) {
    section(pdf, 'Work set by the teacher');
    const today = localDay(at);
    table(
      pdf,
      [{ label: 'Task', w: 280 }, { label: 'Due', w: 90 }, { label: 'Status', w: 129 }],
      assigns.map((a) => {
        const st = assignmentStatus(db, a, learnerId);
        return [a.title, a.due_at, st.done ? (st.scorePct !== null ? `Done: ${st.scorePct}%` : 'Done') : a.due_at < today ? 'Overdue' : 'Not done yet'];
      }),
      (r, c) => {
        if (c !== 2) return undefined;
        const a = assigns[r]!;
        const st = assignmentStatus(db, a, learnerId);
        return st.done ? TICK : a.due_at < localDay(at) ? RED : INK2;
      },
    );
  }

  // Exam readiness
  const exam = one<{ title: string; exam_date: string; skill_ids: string }>(db, 'SELECT title, exam_date, skill_ids FROM exams WHERE user_id = ? AND exam_date >= ? ORDER BY exam_date LIMIT 1', learnerId, localDay(at));
  if (exam) {
    const r = computeReadiness(JSON.parse(exam.skill_ids) as string[], states, exam.exam_date, at);
    section(pdf, 'Exam readiness');
    pdf.para(`${exam.title} on ${exam.exam_date} (${r.daysLeft} days away): estimated readiness ${r.score}% (${r.confidence} confidence). ${r.highRisk.length ? `${r.highRisk.length} topic${r.highRisk.length === 1 ? ' needs' : 's need'} the most attention.` : ''}`, { size: 10 });
  }

  section(pdf, 'How to help at home');
  const tips: string[] = [];
  if (junior) {
    if (activeDays < 3) tips.push('Little and often works best at this age: 10 to 15 minutes on most days, at the same time each day.');
    if (accuracy !== null && accuracy < 55) tips.push('Many answers were wrong this week. Sit with them for a set or two: after a mistake, press "Watch first" together, then let them try again on their own.');
    if (accuracy !== null && accuracy >= 85) tips.push('Accuracy is high, so the questions will get harder by themselves. If they find something easy, ask them to show you how they know.');
    tips.push('Do one of the Move, Make or Talk activities on their page together. They take 5 to 10 minutes and need no screen.');
    tips.push(icanNew.length ? `Ask them to show you: "${icanNew[0]!.text}" Use real objects: spoons, a cereal box, the washing.` : 'Ask them to show you one thing they learnt, using real objects: count spoons, read a cereal box, sort the washing.');
  } else {
    if (activeDays < 3) tips.push(`Agree on a regular time: 20 minutes on 4 days a week is enough to see steady progress.`);
    if (accuracy !== null && accuracy < 55) tips.push('Many answers were wrong this week. Encourage using hints and the worked solutions after each mistake: that is where the learning happens.');
    if (accuracy !== null && accuracy >= 85) tips.push('Accuracy is high. Encourage trying the harder questions and the next skill on the Home screen.');
    tips.push('Ask them to explain one thing they learnt this week to you. Explaining it out loud is one of the best ways to make it stick.');
  }
  for (const t of tips) pdf.para(`•  ${t}`, { size: 9.5, color: INK2, gap: 2 });

  pdf.y += 10;
  pdf.para('Mastery is an estimate based on how the learner answers questions of different difficulty, and it drops slowly when a skill isn\'t practised. "Proficient" starts at 70%.', { size: 8, color: INK3 });

  const summaryText = `${minutes} minutes, ${wk.n} questions${accuracy !== null ? ` (${accuracy}% correct)` : ''}, ${activeDays} active day${activeDays === 1 ? '' : 's'}`;
  return { pdf: pdf.build(`Magubane Labs progress report: ${user.displayName}, ${fmtDay(at)}. Private: for the learner, their guardian and teacher.`), name: `Magubane-Labs-${user.displayName.replace(/[^A-Za-z0-9]+/g, '-')}-${localDay(at)}.pdf`, summary: summaryText };
}

// ---------- class report ----------

export function classReportPdf(db: Db, teacher: UserDto, classId: string): { pdf: Buffer; name: string } {
  const d = classDetail(db, teacher, classId);
  const at = now();
  const pdf = new Pdf();
  header(pdf, `${d.class.name}: class report`, `${d.class.subjectName}, Grade ${d.class.grade}. ${d.teacherName}${d.school ? `, ${d.school}` : ''}. Week ending ${fmtDay(at)}.`, 'Teacher report');
  const flagged = d.learners.filter((l) => l.flags.some((f) => f !== 'new'));
  tiles(pdf, [
    { label: 'Learners', value: String(d.class.learnerCount), note: `${d.class.activeThisWeek} active this week` },
    { label: 'Average mastery', value: d.class.avgMastery === null ? '–' : `${d.class.avgMastery}%`, note: 'Across skills started' },
    { label: 'Need attention', value: String(flagged.length), note: 'Inactive, struggling or overdue' },
    { label: 'Open assignments', value: String(d.class.openAssignments), note: 'Due today or later' },
  ]);

  section(pdf, 'Learners');
  const FLAG: Record<string, string> = { inactive: 'inactive', struggling: 'struggling', overdue: 'overdue', new: 'new' };
  table(
    pdf,
    [{ label: 'Learner', w: 130 }, { label: 'Min (7d)', w: 50, align: 'right' }, { label: 'Qs (7d)', w: 45, align: 'right' }, { label: 'Accuracy', w: 55, align: 'right' }, { label: 'Mastery', w: 55, align: 'right' }, { label: '', w: 12 }, { label: 'Flags', w: 152 }],
    d.learners.map((l) => [l.name, String(l.minutes7d), String(l.questions7d), l.accuracy7d === null ? '–' : `${l.accuracy7d}%`, l.avgMastery === null ? '–' : `${l.avgMastery}%`, '', l.flags.map((f) => FLAG[f]).join(', ') || 'on track']),
    (r, c) => (c === 6 ? (d.learners[r]!.flags.some((f) => f !== 'new') ? RED : TICK) : undefined),
  );

  const skills = d.skills.filter((s) => s.classAvg !== null).sort((a, b) => (a.classAvg ?? 0) - (b.classAvg ?? 0));
  if (skills.length) {
    section(pdf, 'Skills: class average (weakest first)');
    for (const s of skills.slice(0, 12)) barRow(pdf, s.name, s.classAvg, `${s.started} learner${s.started === 1 ? '' : 's'}`);
  }

  if (d.mistakes.length) {
    section(pdf, 'Most common misconceptions (last 30 days)');
    for (const m of d.mistakes.slice(0, 5)) {
      pdf.ensure(40);
      pdf.text(pdf.margin, pdf.y, `${m.label}: ${m.learners} learner${m.learners === 1 ? '' : 's'}, ${m.count} time${m.count === 1 ? '' : 's'}`, { size: 9.5, bold: true });
      pdf.y += 14;
      pdf.para(`${m.tip} Seen in: ${m.skills.slice(0, 3).join(', ')}.`, { size: 9, color: INK2, gap: 6 });
    }
  }

  if (d.assignments.length) {
    section(pdf, 'Assignments');
    table(
      pdf,
      [{ label: 'Task', w: 250 }, { label: 'Due', w: 80 }, { label: 'Completed', w: 90, align: 'right' }, { label: 'Avg score', w: 79, align: 'right' }],
      d.assignments.slice(0, 15).map((a) => [a.title, a.dueAt, `${a.completed ?? 0} of ${a.total ?? 0}`, a.avgScore == null ? '–' : `${a.avgScore}%`]),
    );
  }

  return { pdf: pdf.build(`Magubane Labs class report: ${d.class.name}, ${fmtDay(at)}. Confidential: contains learner data.`), name: `Magubane-Labs-${d.class.name.replace(/[^A-Za-z0-9]+/g, '-')}-${localDay(at)}.pdf` };
}

// ---------- sending ----------

interface LearnerContact {
  id: string;
  display_name: string;
  is_minor: number;
  guardian_email: string | null;
  guardian_name: string | null;
  guardian_reports_off: number;
}

/** Emails a learner's report to their guardian (minors) and, when sent by a teacher, to that teacher. */
export async function sendLearnerReport(db: Db, learnerId: string, opts: { teacher?: UserDto; note?: string | undefined; period?: string; kind?: string; includeTeacher?: boolean }): Promise<ReportSentDto> {
  const c = one<LearnerContact>(db, 'SELECT id, display_name, is_minor, guardian_email, guardian_name, guardian_reports_off FROM users WHERE id = ?', learnerId);
  if (!c) throw new HttpError(404, 'not_found', 'That learner does not exist.');
  const report = learnerReportPdf(db, learnerId, { note: opts.note, noteFrom: opts.teacher?.displayName });
  const sentTo: ReportSentDto['sentTo'] = [];
  const kind = opts.kind ?? 'learner-report';
  if (c.is_minor && c.guardian_email && !c.guardian_reports_off) {
    const { html, text } = layout({
      heading: `${c.display_name}'s progress this week`,
      paragraphs: [`Hello${c.guardian_name ? ` ${c.guardian_name}` : ''}. Here is ${c.display_name}'s progress report from Magubane Labs: ${report.summary}.`, ...(opts.note && opts.teacher ? [`${opts.teacher.displayName} added a note: "${opts.note}"`] : []), 'The full report is attached as a PDF.'],
      footer: `You get this because ${c.display_name} is under 18 and gave your email address. To stop these reports: ${unsubscribeUrl(db, learnerId)}`,
    });
    const r = logged(db, learnerId, c.guardian_email, kind, await sendMail({ to: { email: c.guardian_email, ...(c.guardian_name ? { name: c.guardian_name } : {}) }, subject: `${c.display_name}'s Magubane Labs progress report`, html, text, attachments: [{ filename: report.name, content: report.pdf }] }), { period: opts.period ?? null });
    sentTo.push({ role: 'guardian', email: c.guardian_email, status: r.status });
  }
  if (opts.teacher && opts.includeTeacher !== false) {
    const { html, text } = layout({ heading: `Report for ${c.display_name}`, paragraphs: [`${c.display_name}: ${report.summary}.`, sentTo.length ? `A copy went to their guardian at ${sentTo[0]!.email}.` : 'No guardian email is on file, so only you received this.', 'The full report is attached.'] });
    const r = logged(db, learnerId, opts.teacher.email, kind, await sendMail({ to: { email: opts.teacher.email, name: opts.teacher.displayName }, subject: `Progress report: ${c.display_name}`, html, text, attachments: [{ filename: report.name, content: report.pdf }] }), { period: opts.period ?? null });
    sentTo.push({ role: 'teacher', email: opts.teacher.email, status: r.status });
  }
  return { sentTo };
}

export async function sendClassReport(db: Db, teacher: UserDto, classId: string, period?: string): Promise<ReportSentDto> {
  const rep = classReportPdf(db, teacher, classId);
  const d = classDetail(db, teacher, classId);
  const flagged = d.learners.filter((l) => l.flags.some((f) => f !== 'new'));
  const { html, text } = layout({
    heading: `${d.class.name}: weekly class report`,
    paragraphs: [
      `${d.class.activeThisWeek} of ${d.class.learnerCount} learners were active this week. Average mastery: ${d.class.avgMastery ?? '–'}%.`,
      flagged.length ? `Needing attention: ${flagged.map((l) => l.name).slice(0, 8).join(', ')}${flagged.length > 8 ? ` and ${flagged.length - 8} more` : ''}.` : 'No learners are flagged this week.',
      ...(d.mistakes[0] ? [`Most common misconception: ${d.mistakes[0].label} (${d.mistakes[0].learners} learners).`] : []),
      'The full report is attached as a PDF.',
    ],
    button: { label: 'Open the class', url: `${config.publicUrl}/teach/classes/${classId}` },
  });
  const r = logged(db, null, teacher.email, 'class-report', await sendMail({ to: { email: teacher.email, name: teacher.displayName }, subject: `${d.class.name}: weekly report`, html, text, attachments: [{ filename: rep.name, content: rep.pdf }] }), { classId, period: period ?? null });
  return { sentTo: [{ role: 'teacher', email: teacher.email, status: r.status }] };
}

export function unsubscribe(db: Db, learnerId: string, token: string): boolean {
  if (!verifySigned(db, 'unsub', learnerId, token)) return false;
  run(db, 'UPDATE users SET guardian_reports_off = 1 WHERE id = ?', learnerId);
  return true;
}

// ---------- weekly schedule ----------

function sastParts(d: Date): { day: number; hour: number; date: string } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Johannesburg', weekday: 'short', hour: 'numeric', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).map((p) => [p.type, p.value]));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { day: days.indexOf(parts.weekday as string), hour: Number(parts.hour), date: `${parts.year}-${parts.month}-${parts.day}` };
}

/** Sends this week's reports once. Safe to call repeatedly: each recipient is sent at most once per period. */
export async function runWeeklyReports(db: Db, at = now()): Promise<{ guardians: number; teachers: number }> {
  const p = sastParts(at);
  if (p.day !== config.reportDay || p.hour < config.reportHour) return { guardians: 0, teachers: 0 };
  const period = p.date;
  let guardians = 0;
  let teachers = 0;
  const minors = all<{ id: string }>(db, `SELECT id FROM users WHERE role = 'student' AND is_minor = 1 AND guardian_email IS NOT NULL AND guardian_reports_off = 0 AND email_verified_at IS NOT NULL AND created_at <= ?`, new Date(at.getTime() - 3 * 86_400_000).toISOString());
  for (const m of minors) {
    if (one(db, "SELECT 1 FROM email_log WHERE learner_id = ? AND kind = 'weekly-guardian' AND period = ?", m.id, period)) continue;
    try {
      const r = await sendLearnerReport(db, m.id, { period, kind: 'weekly-guardian' });
      guardians += r.sentTo.length;
    } catch (e) {
      console.error('[reports] guardian report failed', m.id, (e as Error).message);
    }
  }
  const classes = all<{ id: string; teacher_id: string }>(db, "SELECT c.id, c.teacher_id FROM classes c WHERE c.archived_at IS NULL AND c.weekly_reports = 1 AND EXISTS (SELECT 1 FROM class_members m WHERE m.class_id = c.id)");
  for (const c of classes) {
    if (one(db, "SELECT 1 FROM email_log WHERE class_id = ? AND kind = 'class-report' AND period = ?", c.id, period)) continue;
    const t = getUser(db, c.teacher_id);
    if (!t?.emailVerified) continue;
    try {
      await sendClassReport(db, t, c.id, period);
      teachers++;
    } catch (e) {
      console.error('[reports] class report failed', c.id, (e as Error).message);
    }
  }
  if (guardians || teachers) console.log(`[reports] weekly reports for ${period}: ${guardians} guardian, ${teachers} teacher`);
  return { guardians, teachers };
}

export function startReportScheduler(db: Db): () => void {
  if (!config.reportsEnabled) return () => undefined;
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    runWeeklyReports(db)
      .catch((e) => console.error('[reports]', e))
      .finally(() => (running = false));
  };
  const timer = setInterval(tick, 15 * 60_000);
  timer.unref();
  setTimeout(tick, 30_000).unref();
  return () => clearInterval(timer);
}
