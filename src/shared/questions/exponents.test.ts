/**
 * Exponents, Grades 7–9: every answer is worked out again from the prompt alone, by a small evaluator that reads the
 * prompt's TeX. Each prompt must match one of the known patterns, so a new question type can't slip in unchecked.
 * Also: the power-form check and the scientific-notation answer kind.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { gradeResponse, canonicalResponse } from './answer.ts';
import { parseExpression, powerFormProblem } from './expr.ts';
import type { AnswerSpec, GeneratedQuestion } from './types.ts';

const SEEDS = Number(process.env.SEEDS ?? 300);
const VARS = ['a', 'b', 'x', 'y', 'm', 'p', 'k', 't'];
const POINTS = [
  [1.3, 0.7, 1.7, 0.6, 1.1, 1.4, 0.8, 1.2],
  [0.9, 1.6, 0.75, 1.35, 1.8, 0.65, 1.25, 0.55],
];

/** TeX (or the answer checker's plain text) → a JavaScript expression in the variables a, b, x, y, m, p, k, t. */
function toJs(src: string): string {
  let s = src
    .replace(/\\,/g, '')
    .replace(/\{,\}/g, '.')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\\times|\\cdot/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\left|\\right/g, '');
  for (let i = 0; i < 30; i++) {
    const before = s;
    s = s
      .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\sqrt\[3\]\{([^{}]*)\}/g, 'C($1)')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'S($1)')
      .replace(/\^\{([^{}]*)\}/g, '**($1)');
    if (s === before) break;
  }
  s = s.replace(/\^(-?\d+)/g, '**($1)').replace(/\s+/g, '');
  // JavaScript refuses -a**b, so a leading minus becomes 0 - …
  s = s.replace(/(^|\()-/g, '$10-');
  // Implicit multiplication: 6m**(4)p, 2(x), )(
  s = s.replace(/([0-9a-z)])(?=[a-z(SC])/g, '$1*');
  return s;
}

function evaluate(src: string, point = POINTS[0]!): number {
  const f = new Function(...VARS, 'S', 'C', `return ${toJs(src)};`) as (...a: unknown[]) => number;
  return f(...point, Math.sqrt, Math.cbrt);
}

const close = (a: number, b: number, rel = 1e-9) => Math.abs(a - b) <= Math.max(Math.abs(b) * rel, 1e-12);

function answerValue(a: AnswerSpec): number {
  if (a.kind === 'numeric') return a.value;
  if (a.kind === 'fraction') return a.n / a.d;
  if (a.kind === 'scientific') return a.a * 10 ** a.e;
  throw new Error(`no value for ${a.kind}`);
}

/** Checks one question against its prompt. Returns the name of the pattern it matched, or null. */
function check(q: GeneratedQuestion, where: string): string | null {
  const p = q.prompt;
  const a = q.answer;
  let m: RegExpExecArray | null;

  if (a.kind === 'scientific') assert.ok(Math.abs(a.a) >= 1 && Math.abs(a.a) < 10, `${where}: ${a.a} isn't between 1 and 10`);
  if (a.kind === 'expression') {
    assert.equal(a.form, 'power', `${where}: expression answers are graded in power form`);
    assert.equal(powerFormProblem(parseExpression(a.expr)), null, `${where}: the answer ${a.expr} isn't in power form itself`);
    if (q.input.kind === 'expression') for (const v of a.expr.replace(/[^a-z]/g, '')) assert.ok(q.input.variables.includes(v), `${where}: no key for ${v}`);
  }

  if ((m = /^Simplify \$(.+)\$\.( Write your answer with positive exponents\.)?$/.exec(p))) {
    assert.equal(a.kind, 'expression', where);
    if (a.kind !== 'expression') return null;
    for (const pt of POINTS) assert.ok(close(evaluate(m[1]!, pt), evaluate(a.expr, pt)), `${where}: ${m[1]} ≠ ${a.expr}`);
    if (!m[2]) assert.ok(!a.expr.includes('/'), `${where}: a fraction answer needs the positive-exponents instruction`);
    return 'simplify';
  }
  if ((m = /^Calculate \$(.+?)\$(?:, where \$[a-z] \\neq 0\$)?\.( Give your answer in scientific notation\.)?$/.exec(p))) {
    assert.ok(close(evaluate(m[1]!), answerValue(a)), `${where}: ${m[1]} = ${evaluate(m[1]!)}, answer ${answerValue(a)}`);
    assert.equal(a.kind, m[2] ? 'scientific' : 'numeric', where);
    return 'calculate';
  }
  if ((m = /^Write \$(.+)\$ as an ordinary number\.$/.exec(p))) {
    assert.ok(close(evaluate(m[1]!), answerValue(a), 1e-12), `${where}: ${evaluate(m[1]!)} vs ${answerValue(a)}`);
    return 'ordinary';
  }
  if ((m = /^Write \$(.+)\$ as a fraction\.$/.exec(p))) {
    assert.ok(close(evaluate(m[1]!), answerValue(a)), where);
    return 'fraction';
  }
  if ((m = /^Write \$(.+?)\$ as a power of 10/.exec(p))) {
    assert.ok(close(10 ** answerValue(a), evaluate(m[1]!)), where);
    return 'power of 10';
  }
  if (/scientific notation\.$/.test(p) && (m = /\$([\d\\,{}]+)\$/.exec(p))) {
    assert.ok(close(evaluate(m[1]!), answerValue(a), 1e-12), `${where}: ${m[1]} vs ${JSON.stringify(a)}`);
    return 'to scientific';
  }
  if ((m = /^Write \$(.+)\$ in exponential form\.$/.exec(p)) && q.input.kind === 'choice' && a.kind === 'choice') {
    const text = (id: string) => q.input.kind === 'choice' && q.input.options.find((o) => o.id === id)!.text.replace(/\$/g, '');
    const target = evaluate(m[1]!);
    for (const o of q.input.options) assert.equal(close(evaluate(text(o.id) as string), target), o.id === a.id, `${where}: option ${o.text}`);
    return 'exponential form';
  }
  if ((m = /^Which is bigger, \$(.+)\$ or \$(.+)\$\?$/.exec(p)) && a.kind === 'choice') {
    const [x, y] = [evaluate(m[1]!), evaluate(m[2]!)];
    assert.equal(a.id, x === y ? 'equal' : x > y ? 'first' : 'second', `${where}: ${x} vs ${y}`);
    return 'compare';
  }
  if ((m = /^Solve for \$x\$: \$(\d+)\^\{(.+)\} = (.+)\$\.$/.exec(p))) {
    const x = answerValue(a);
    const exponent = evaluate(m[2]!.replace(/x/g, `(${x})`));
    assert.ok(close(Number(m[1]) ** exponent, evaluate(m[3]!)), `${where}: x = ${x}`);
    return 'equation';
  }
  const v = answerValue(a);
  if ((m = /area of \$(\d+)\$ m²/.exec(p))) return assert.equal(v * v, Number(m[1]), where), 'garden';
  if ((m = /volume of \$([\d\\,]+)\$ cm³/.exec(p))) return assert.equal(v ** 3, evaluate(m[1]!), where), 'box';
  if ((m = /(?:after|in half again,) (\d+) (?:hours|times)/.exec(p))) return assert.equal(v, 2 ** Number(m[1]), where), 'doubling';
  if ((m = /in round (\d+)\?$/.exec(p))) return assert.equal(v, 3 ** Number(m[1]), where), 'message';
  return null;
}

for (const id of ['powers-roots', 'exponent-laws']) {
  test(`${id}: every answer follows from its prompt`, () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      let diagnosed = 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const where = `${id} L${level} seed ${seed}`;
        const q = generateQuestion(id, seed * 104729, level);
        assert.ok(check(q, where), `${where}: prompt matches no known pattern: ${q.prompt}`);
        if (q.misconceptions.length) diagnosed++;
      }
      // A few questions have no likely wrong answer worth naming (∛8, 2^x = 2); nearly all should.
      assert.ok(diagnosed >= SEEDS * 0.85, `${id} L${level}: only ${diagnosed}/${SEEDS} questions predict a mistake`);
    }
  });
}

test('the evaluator itself: TeX the generators write', () => {
  assert.equal(evaluate('-3^{2}'), -9);
  assert.equal(evaluate('(-3)^{3}'), -27);
  assert.equal(evaluate('\\sqrt{36 + 64}'), 10);
  assert.equal(evaluate('\\sqrt[3]{125}'), 5);
  assert.equal(evaluate('45\\,600\\,000'), 45600000);
  assert.ok(close(evaluate('4{,}2 \\times 10^{-4}'), 0.00042));
  assert.ok(close(evaluate('\\dfrac{24x^{9}}{6x^{4}}'), 4 * 1.7 ** 5));
  assert.ok(close(evaluate('3/(2x^4)'), 3 / (2 * 1.7 ** 4)));
});

test('power form: the law has to be applied, not just the value kept', () => {
  const spec: AnswerSpec = { kind: 'expression', expr: '6x^5y^4', form: 'power' };
  assert.equal(gradeResponse(spec, '6x^5y^4').correct, true);
  assert.equal(gradeResponse(spec, '6y^4x^5').correct, true);
  assert.equal(gradeResponse(spec, '2x^2*3x^3y^4').mistake, 'unsimplified');
  assert.equal(gradeResponse(spec, '6x^5y^2y^2').mistake, 'unsimplified');
  const frac: AnswerSpec = { kind: 'expression', expr: 'b^2/(a^3)', form: 'power' };
  assert.equal(gradeResponse(frac, 'b^2/a^3').correct, true);
  assert.equal(gradeResponse(frac, 'a^2b^2/a^5').mistake, 'unsimplified');
  assert.match(gradeResponse(frac, 'b^2*a^-3').parseError ?? '', /positive exponents/);
  const coef: AnswerSpec = { kind: 'expression', expr: '3/(2x^4)', form: 'power' };
  assert.equal(gradeResponse(coef, '3/(2x^4)').correct, true);
  assert.equal(gradeResponse(coef, '6/(4x^4)').mistake, 'unsimplified');
  // Grade 10 level 4 now grades the form too.
  for (let seed = 1; seed <= 20; seed++) {
    const q = generateQuestion('exponents', seed, 4);
    assert.equal(q.answer.kind === 'expression' && q.answer.form, 'power');
  }
});

test('scientific notation: equal value in the wrong form is diagnosed, not marked right', () => {
  const spec: AnswerSpec = { kind: 'scientific', a: 4.56, e: 7 };
  assert.equal(gradeResponse(spec, ['4,56', '7']).correct, true);
  assert.equal(gradeResponse(spec, ['4.560', '7']).correct, true);
  assert.equal(gradeResponse(spec, '4,56 × 10^7').correct, true);
  assert.equal(gradeResponse(spec, ['45,6', '6']).mistake, 'scientific-notation');
  assert.equal(gradeResponse(spec, ['4,56', '-7']).correct, false);
  assert.ok(gradeResponse(spec, ['4,56', '']).parseError);
  assert.ok(gradeResponse(spec, ['4,56', '2,5']).parseError);
  const small: AnswerSpec = { kind: 'scientific', a: 3.2, e: -4 };
  assert.equal(gradeResponse(small, ['3,2', '−4']).correct, true);
  assert.equal(gradeResponse(small, ['0,32', '-3']).mistake, 'scientific-notation');
  assert.deepEqual(canonicalResponse(small), ['3.2', '-4']);
});
