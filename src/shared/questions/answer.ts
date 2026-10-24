/**
 * Response parsing and grading. Runs on the server only — the client never sees an AnswerSpec
 * before responding. Accepts the way South African learners write numbers: "2,5" and "2.5".
 */
import { rat, eq as req, toNumber, type Rational } from './rational.ts';
import { parseExpression, toPoly, polyEqual, isExpandedForm, isFactorisedForm, ParseError } from './expr.ts';
import type { AnswerSpec, Misconception, RichText } from './types.ts';
import type { MistakeCode } from './mistakes.ts';

export type ResponseValue = string | string[];

export interface GradeResult {
  correct: boolean;
  /** The response couldn't be read — ask the learner to re-type it; don't count it as wrong. */
  parseError?: string;
  mistake?: MistakeCode;
  feedback?: RichText;
}

/** Parses "3", "-2,5", "0.75", "3/4", "-3/4", "1 1/2". Returns exact rational when possible. */
export function parseNumber(raw: string): { value: number; exact: Rational | null } | null {
  let s = raw
    .trim()
    .replace(/[−–—]/g, '-')
    .replace(/[\s\u00a0\u202f]+/g, ' ')
    .replace(/^x\s*=\s*/i, '');
  if (!s) return null;
  // South African digit grouping: "4 725" or "1 250 000,5".
  if (/^-?\d{1,3}(?: \d{3})+(?:[.,]\d+)?$/.test(s)) s = s.replace(/ /g, '');
  const mixed = /^(-?)(\d+) (\d+)\/(\d+)$/.exec(s);
  if (mixed) {
    const [, sign, w, n, d] = mixed;
    if (Number(d) === 0) return null;
    const r = rat((Number(w) * Number(d) + Number(n)) * (sign ? -1 : 1), Number(d));
    return { value: toNumber(r), exact: r };
  }
  const frac = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(s);
  if (frac) {
    const d = Number(frac[2]);
    if (d === 0) return null;
    const r = rat(Number(frac[1]), d);
    return { value: toNumber(r), exact: r };
  }
  const dec = /^-?(\d+([.,]\d*)?|[.,]\d+)$/.exec(s);
  if (dec) {
    const text = s.replace(',', '.');
    const value = Number(text);
    if (!Number.isFinite(value)) return null;
    const [whole = '0', fracPart = ''] = text.replace('-', '').split('.');
    const d = 10 ** fracPart.length;
    const exact = fracPart.length <= 9 ? rat((s.startsWith('-') ? -1 : 1) * (Number(whole || '0') * d + Number(fracPart || '0')), d) : null;
    return { value, exact };
  }
  return null;
}

/** Normalised view of a response for a given answer kind, or a parse error message. */
type Parsed =
  | { kind: 'numeric'; value: number; exact: Rational | null }
  | { kind: 'fraction'; exact: Rational; simplest: boolean }
  | { kind: 'expression'; text: string }
  | { kind: 'roots'; values: Rational[] }
  | { kind: 'coefficients'; values: number[] }
  | { kind: 'choice'; id: string };

function asText(r: ResponseValue): string {
  return Array.isArray(r) ? r.join(',') : r;
}

export function parseResponse(kind: AnswerSpec['kind'], response: ResponseValue): Parsed | { error: string } {
  switch (kind) {
    case 'numeric': {
      const p = parseNumber(asText(response));
      return p ? { kind, value: p.value, exact: p.exact } : { error: 'Enter a number, like 12, -3,5 or 3/4.' };
    }
    case 'fraction': {
      const s = asText(response).trim().replace(/[−–—]/g, '-');
      const p = parseNumber(s);
      if (!p || !p.exact) return { error: 'Enter a fraction like 5/6, or a whole number.' };
      const m = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(s);
      const simplest = m ? rat(Number(m[1]), Number(m[2])).d === Math.abs(Number(m[2])) : true;
      return { kind, exact: p.exact, simplest };
    }
    case 'expression': {
      const text = asText(response).replace(/^\s*[a-z]\s*=\s*/i, '');
      try {
        parseExpression(text);
        return { kind, text };
      } catch (e) {
        return { error: e instanceof ParseError ? `${e.message}. Use * or brackets if you need to, e.g. 2x(x+3).` : 'Check your expression.' };
      }
    }
    case 'roots': {
      const parts = (Array.isArray(response) ? response : response.split(/;|\bor\b|\band\b|,\s+/))
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length === 0) return { error: 'Enter each solution.' };
      const values: Rational[] = [];
      for (const part of parts) {
        const p = parseNumber(part);
        if (!p || !p.exact) return { error: `Can't read "${part}". Enter numbers like -3 or 1/2.` };
        values.push(p.exact);
      }
      return { kind, values };
    }
    case 'coefficients': {
      const parts = Array.isArray(response) ? response : response.split(/[,\s]+/);
      const values = parts.map((p) => (p.trim() === '' ? 1 : Number(p.trim())));
      if (values.some((v) => !Number.isInteger(v) || v < 1 || v > 30)) return { error: 'Coefficients are whole numbers from 1 upwards. Leave a box empty for 1.' };
      return { kind, values };
    }
    case 'choice': {
      const id = asText(response).trim();
      return id ? { kind, id } : { error: 'Choose an option.' };
    }
  }
}

function numericMatches(spec: Extract<AnswerSpec, { kind: 'numeric' }>, value: number): boolean {
  const tol = spec.relative ? Math.abs(spec.value) * spec.tolerance : spec.tolerance;
  return Math.abs(value - spec.value) <= Math.max(tol, 1e-9);
}

function sameMultiset(a: Rational[], b: { n: number; d: number }[]): boolean {
  if (a.length !== b.length) {
    // a repeated root may be entered once or twice
    const uniq = (xs: { n: number; d: number }[]) => xs.filter((x, i) => xs.findIndex((y) => req(rat(x.n, x.d), rat(y.n, y.d))) === i);
    const ua = uniq(a);
    const ub = uniq(b);
    if (ua.length !== ub.length) return false;
    return ua.every((x) => ub.some((y) => req(rat(x.n, x.d), rat(y.n, y.d))));
  }
  const rest = b.map((x) => rat(x.n, x.d));
  for (const x of a) {
    const i = rest.findIndex((y) => req(x, y));
    if (i < 0) return false;
    rest.splice(i, 1);
  }
  return true;
}

/** Does the parsed response equal this spec (value only, ignoring form constraints)? */
function matchesValue(spec: AnswerSpec, parsed: Parsed): boolean {
  switch (spec.kind) {
    case 'numeric':
      if (parsed.kind === 'numeric') return numericMatches(spec, parsed.value);
      if (parsed.kind === 'fraction') return numericMatches(spec, toNumber(parsed.exact));
      return false;
    case 'fraction':
      if (parsed.kind === 'fraction' || parsed.kind === 'numeric') {
        const exact = parsed.exact;
        return exact !== null && req(exact, rat(spec.n, spec.d));
      }
      return false;
    case 'expression': {
      if (parsed.kind !== 'expression') return false;
      try {
        const a = toPoly(parseExpression(parsed.text));
        const b = toPoly(parseExpression(spec.expr));
        return a !== null && b !== null && polyEqual(a, b);
      } catch {
        return false;
      }
    }
    case 'roots':
      return parsed.kind === 'roots' && sameMultiset(parsed.values, spec.values);
    case 'coefficients':
      return parsed.kind === 'coefficients' && parsed.values.length === spec.values.length && parsed.values.every((v, i) => v === spec.values[i]);
    case 'choice':
      return parsed.kind === 'choice' && parsed.id === spec.id;
  }
}

function formOk(spec: AnswerSpec, parsed: Parsed): boolean {
  if (spec.kind === 'fraction' && spec.requireSimplest && parsed.kind === 'fraction') return parsed.simplest;
  if (spec.kind !== 'expression' || !spec.form || parsed.kind !== 'expression') return true;
  const node = parseExpression(parsed.text);
  return spec.form === 'expanded' ? isExpandedForm(node) : isFactorisedForm(node);
}

export function gradeResponse(answer: AnswerSpec, response: ResponseValue, misconceptions: Misconception[] = []): GradeResult {
  const parsed = parseResponse(answer.kind, response);
  if ('error' in parsed) return { correct: false, parseError: parsed.error };

  if (matchesValue(answer, parsed)) {
    if (formOk(answer, parsed)) return { correct: true };
    if (answer.kind === 'fraction') {
      return { correct: false, mistake: 'unsimplified', feedback: 'That fraction has the right value, but it isn\'t in simplest form.' };
    }
    if (answer.kind === 'expression' && answer.form === 'factorised') {
      return { correct: false, mistake: 'not-fully-factorised', feedback: 'That is equal to the expression, but it isn\'t fully factorised.' };
    }
    return { correct: false, mistake: 'unsimplified', feedback: 'That is equal in value, but it isn\'t written in the form the question asks for.' };
  }

  for (const m of misconceptions) {
    if (m.answer.kind === answer.kind && matchesValue(m.answer, parsed)) {
      return { correct: false, mistake: m.code, feedback: m.feedback };
    }
  }

  if (answer.kind === 'coefficients' && parsed.kind === 'coefficients') {
    const k = parsed.values[0]! / answer.values[0]!;
    if (Number.isInteger(k) && k > 1 && parsed.values.every((v, i) => v === answer.values[i]! * k)) {
      return { correct: false, mistake: 'not-lowest-ratio', feedback: 'Your equation balances, but every coefficient shares a common factor.' };
    }
    return { correct: false, mistake: 'unbalanced', feedback: 'Count each element on both sides. They don\'t match yet.' };
  }

  return { correct: false };
}

/** The response a learner would type for this answer (used for self-checks and filtering). */
export function canonicalResponse(a: AnswerSpec): ResponseValue {
  switch (a.kind) {
    case 'numeric':
      return String(a.value);
    case 'fraction':
      return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
    case 'expression':
      return a.expr;
    case 'roots':
      return a.values.map((v) => (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`));
    case 'coefficients':
      return a.values.map(String);
    case 'choice':
      return a.id;
  }
}

/** Human-readable echo of what the learner entered, for review screens. */
export function responseText(response: ResponseValue): string {
  return Array.isArray(response) ? response.map((r) => r.trim() || '1').join(', ') : response;
}
