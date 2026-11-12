/**
 * Euclidean proofs: every statement in every proof is measured on its own diagram.
 * A right statement (given or the answer to a blank) must be true in the figure; a wrong option must be clearly false.
 * That checks the geometry, the drawing and the relabelling together, independently of how the proofs were written.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { gradeResponse, canonicalResponse } from './answer.ts';
import { PROOF_REASONS } from './generators/math-proofs.ts';
import { DIFFICULTIES, type GeometryFigure, type ProofCell } from './types.ts';

const deg = (r: number) => (r * 180) / Math.PI;

function measure(fig: GeometryFigure) {
  const pts = new Map(fig.points.map((p) => [p.id, p]));
  const get = (id: string) => {
    const p = pts.get(id);
    if (!p) throw new Error(`no point ${id} in the figure`);
    return p;
  };
  const ang = (s: string) => {
    const [a, b, c] = [...s].map(get) as [ReturnType<typeof get>, ReturnType<typeof get>, ReturnType<typeof get>];
    const u = [a.x - b.x, a.y - b.y];
    const v = [c.x - b.x, c.y - b.y];
    return deg(Math.acos(Math.max(-1, Math.min(1, (u[0]! * v[0]! + u[1]! * v[1]!) / (Math.hypot(u[0]!, u[1]!) * Math.hypot(v[0]!, v[1]!))))));
  };
  const len = (s: string) => {
    const [a, b] = [...s].map(get) as [ReturnType<typeof get>, ReturnType<typeof get>];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const area = (s: string) => {
    const [a, b, c] = [...s].map(get) as [ReturnType<typeof get>, ReturnType<typeof get>, ReturnType<typeof get>];
    return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  };
  const mark = (t: string) => {
    const m = fig.angles?.find((a) => a.text === t);
    return m ? ang(m.from + m.at + m.to) : NaN;
  };
  return { get, ang, len, area, x: mark('x'), y: mark('y') };
}
type M = ReturnType<typeof measure>;

function evaluate(expr: string, m: M): number {
  const js = expr
    .replace(/area Δ([A-Z]{3})/g, 'ar("$1")')
    .replace(/reflex ∠([A-Z]{3})/g, '(360 - an("$1"))')
    .replace(/∠([A-Z]{3})/g, 'an("$1")')
    .replace(/(?<![A-Z"])([A-Z]{2})(?![A-Z"])/g, 'ln("$1")')
    .replace(/²/g, '**2')
    .replace(/·/g, '*')
    .replace(/½/g, '0.5*')
    .replace(/°/g, '')
    .replace(/−/g, '-')
    .replace(/(?<![a-z])x(?![a-z])/g, '(vx)')
    .replace(/(?<![a-z])y(?![a-z])/g, '(vy)')
    .replace(/(\d)\s*(?=[a-z(])/g, '$1*')
    .replace(/\)\s*(?=[a-z(0-9])/g, ')*');
  if (/[A-Z]/.test(js.replace(/"[A-Z]+"/g, ''))) throw new Error(`cannot read "${expr}" (${js})`);
  const v = Function('an', 'ln', 'ar', 'vx', 'vy', `return (${js});`)(m.ang, m.len, m.area, m.x, m.y) as number;
  if (!Number.isFinite(v)) throw new Error(`"${expr}" is not a number (${js})`);
  return v;
}

/** How far a statement is from true: 0 when it holds, otherwise the relative size of the worst mismatch. */
function gap(stmt: string, m: M): number {
  const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b));
  let r: RegExpExecArray | null;
  if ((r = /^([A-Z]{4}) is a cyclic quad$/.exec(stmt))) {
    const [w, x, y, z] = [...r[1]!];
    return rel(m.ang(w! + x + y) + m.ang(y! + z + w), 180);
  }
  if ((r = /^Δ([A-Z]{3}) (\|\|\||≡) Δ([A-Z]{3})$/.exec(stmt))) {
    const [p, op, q] = [r[1]!, r[2]!, r[3]!];
    const angleAt = (t: string, i: number) => m.ang(t[(i + 2) % 3]! + t[i] + t[(i + 1) % 3]);
    let worst = Math.max(...[0, 1, 2].map((i) => rel(angleAt(p, i), angleAt(q, i))));
    if (op === '≡') worst = Math.max(worst, ...[0, 1, 2].map((i) => rel(m.len(p[i]! + p[(i + 1) % 3]), m.len(q[i]! + q[(i + 1) % 3]))));
    return worst;
  }
  if ((r = /^([A-Z])([A-Z]) ∥ ([A-Z])([A-Z])$/.exec(stmt))) {
    const [a, b, c, d] = [m.get(r[1]!), m.get(r[2]!), m.get(r[3]!), m.get(r[4]!)];
    const cross = ((b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x)) / (Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(d.x - c.x, d.y - c.y));
    return Math.abs(cross);
  }
  const parts = stmt.split(' = ').map((e) => evaluate(e, m));
  assert.ok(parts.length >= 2, `not an equation: "${stmt}"`);
  return Math.max(...parts.slice(1).map((v, i) => rel(parts[i]!, v)));
}

/** Reasons name lines (DE ∥ BC); compare them with the line names blanked out, since the letters are relabelled. */
const lineless = (r: string) => r.replace(/(?<![A-Za-z])[A-Z]{2}(?![A-Za-z])/g, '··');
const REASONS = new Set(PROOF_REASONS.map(lineless));

const TRUE_WITHIN = 0.006; // points are stored to 3 decimals
const FALSE_BEYOND = 0.01; // a wrong option must be clearly wrong in the drawing, not wrong by a whisker

for (const id of ['circle-proofs', 'similarity-proofs']) {
  test(`${id}: every right statement is true in its diagram and every wrong one false`, () => {
    for (const level of DIFFICULTIES) {
      const prompts = new Set<string>();
      for (let seed = 1; seed <= 300; seed++) {
        const where = `${id} L${level} seed ${seed}`;
        const q = generateQuestion(id, seed * 104729 + level, level);
        assert.equal(q.input.kind, 'proof', where);
        assert.equal(q.answer.kind, 'proof', where);
        if (q.input.kind !== 'proof' || q.answer.kind !== 'proof' || q.figure?.kind !== 'geometry') throw new Error(where);
        const fig = q.figure;
        const m = measure(fig);
        assert.equal(new Set(fig.points.map((p) => p.id)).size, fig.points.length, `${where}: duplicate point names`);
        for (const s of fig.segments ?? []) {
          m.get(s.a);
          m.get(s.b);
        }
        prompts.add(q.prompt);

        const { ids, at } = q.answer;
        assert.ok(ids.length >= 2, `${where}: only ${ids.length} blank(s)`);
        assert.equal(ids.length, at.length, where);
        q.input.rows.forEach((row, i) => {
          for (const part of ['statement', 'reason'] as const) {
            const cell: ProofCell = part === 'statement' ? row.s : row.r;
            if ('text' in cell) {
              if (part === 'statement') assert.ok(gap(cell.text, m) <= TRUE_WITHIN, `${where}: given statement "${cell.text}" is false (${gap(cell.text, m).toFixed(4)})`);
              continue;
            }
            const k = cell.blank;
            assert.deepEqual(at[k], { row: i, part }, `${where}: blank ${k} is not where the answer says`);
            assert.equal(cell.options.length, 4, `${where}: blank ${k} needs 4 options`);
            assert.equal(new Set(cell.options.map((o) => o.text)).size, 4, `${where}: repeated option in blank ${k}`);
            const right = cell.options.find((o) => o.id === ids[k]);
            assert.ok(right, `${where}: answer to blank ${k} is not an option`);
            for (const o of cell.options) {
              if (part === 'reason') {
                if (o === right) assert.ok(REASONS.has(lineless(o.text)), `${where}: "${o.text}" is not a recognised reason`);
                continue;
              }
              const g = gap(o.text, m);
              if (o === right) assert.ok(g <= TRUE_WITHIN, `${where}: the right statement "${o.text}" is false in the diagram (${g.toFixed(4)})`);
              else assert.ok(g > FALSE_BEYOND, `${where}: the wrong statement "${o.text}" is true in the diagram (${g.toFixed(4)})`);
            }
          }
        });

        // Marking: all right; one wrong names that step; a gap is refused, not marked.
        assert.equal(gradeResponse(q.answer, canonicalResponse(q.answer)).correct, true, where);
        const k = seed % ids.length;
        const cellK = (() => {
          const row = q.input.rows[at[k]!.row]!;
          return (at[k]!.part === 'statement' ? row.s : row.r) as Extract<ProofCell, { blank: number }>;
        })();
        const wrongOpt = cellK.options.find((o) => o.id !== ids[k])!;
        const g = gradeResponse(q.answer, ids.map((x, i) => (i === k ? wrongOpt.id : x)));
        assert.equal(g.correct, false, where);
        assert.equal(g.mistake, 'proof-step', where);
        assert.match(g.feedback ?? '', new RegExp(`${at[k]!.part} in step ${at[k]!.row + 1}`), where);
        assert.deepEqual(g.wrongIds, [`${at[k]!.row}:${at[k]!.part}`], where);
        assert.ok(gradeResponse(q.answer, ids.map((x, i) => (i === 0 ? '' : x))).parseError, `${where}: an empty blank should be refused`);
      }
      assert.ok(prompts.size >= 10, `${id} L${level}: only ${prompts.size} distinct prompts`);
    }
  });
}
