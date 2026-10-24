/**
 * A small, dependency-free PDF writer: A4 pages, Helvetica and Helvetica-Bold (built into every PDF reader),
 * wrapped text, rectangles and lines. Enough for clear, printable progress reports.
 * Text is encoded as WinAnsi; characters outside it are mapped to close equivalents.
 */

const W_REG: number[] = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD: number[] = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

/** Unicode → WinAnsi (cp1252) for the characters our text actually uses. */
const MAP: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '•': 0x95, '–': 0x96, '—': 0x97, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '™': 0x99 };
const SUBST: Record<string, string> = { '\u2212': '-', '\u00d7': 'x', '\u2192': '->', '\u2265': '>=', '\u2264': '<=', '\u2248': '~', '\u00f7': '/', '\u2713': 'v', '\u2717': 'x', '\u00a0': ' ', '\u202f': ' ', '\u2009': ' ', '\u2080': '0', '\u2081': '1', '\u2082': '2', '\u2083': '3', '\u2084': '4', '\u2099': 'n', '\u03c1': 'rho', '\u03a9': 'ohm', '\u0394': 'delta', '\u2026': '...' };

export function toWinAnsi(s: string): number[] {
  const out: number[] = [];
  for (const ch0 of s) {
    const ch = SUBST[ch0] ?? ch0;
    for (const ch2 of ch) {
      const c = ch2.codePointAt(0)!;
      if (MAP[ch2] !== undefined) out.push(MAP[ch2]!);
      else if (c >= 32 && c <= 126) out.push(c);
      else if (c >= 160 && c <= 255) out.push(c);
      else out.push(63); // '?'
    }
  }
  return out;
}

export function textWidth(s: string, size: number, bold = false): number {
  const table = bold ? W_BOLD : W_REG;
  let w = 0;
  for (const c of toWinAnsi(s)) w += c >= 32 && c <= 126 ? table[c - 32]! : c === 0x95 ? 350 : c === 0x96 ? 556 : c === 0x97 ? 1000 : 556;
  return (w * size) / 1000;
}

export function wrap(s: string, size: number, maxWidth: number, bold = false): string[] {
  const lines: string[] = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (textWidth(tryLine, size, bold) <= maxWidth || !line) line = tryLine;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

const esc = (bytes: number[]) =>
  bytes
    .map((b) => (b === 40 || b === 41 || b === 92 ? `\\${String.fromCharCode(b)}` : b < 32 || b > 126 ? `\\${b.toString(8).padStart(3, '0')}` : String.fromCharCode(b)))
    .join('');

export type RGB = [number, number, number];
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const col = (c: RGB) => c.map((v) => v.toFixed(3)).join(' ');

export const A4 = { w: 595.28, h: 841.89 };

/** Coordinates are from the top-left, in points, like a screen. */
export class Pdf {
  private pages: string[][] = [];
  private cur: string[] = [];
  readonly margin = 48;
  y = 0;

  constructor() {
    this.addPage();
  }

  addPage(): void {
    this.cur = [];
    this.pages.push(this.cur);
    this.y = this.margin;
  }

  get width(): number {
    return A4.w - 2 * this.margin;
  }

  /** Start a new page if fewer than `h` points remain. */
  ensure(h: number): void {
    if (this.y + h > A4.h - this.margin - 20) this.addPage();
  }

  text(x: number, y: number, s: string, opts: { size?: number; bold?: boolean; color?: RGB; align?: 'left' | 'right' | 'center' } = {}): void {
    const size = opts.size ?? 10;
    const w = textWidth(s, size, opts.bold);
    const tx = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x;
    this.cur.push(`BT /${opts.bold ? 'F2' : 'F1'} ${size} Tf ${col(opts.color ?? [0.1, 0.11, 0.13])} rg ${tx.toFixed(2)} ${(A4.h - y - size * 0.8).toFixed(2)} Td (${esc(toWinAnsi(s))}) Tj ET`);
  }

  /** Wrapped paragraph at the cursor; advances the cursor. */
  para(s: string, opts: { size?: number; bold?: boolean; color?: RGB; x?: number; width?: number; gap?: number } = {}): void {
    const size = opts.size ?? 10;
    const lh = size * 1.4;
    for (const line of wrap(s, size, opts.width ?? this.width, opts.bold)) {
      this.ensure(lh);
      this.text(opts.x ?? this.margin, this.y, line, opts);
      this.y += lh;
    }
    this.y += opts.gap ?? 4;
  }

  rect(x: number, y: number, w: number, h: number, opts: { fill?: RGB; stroke?: RGB; lineWidth?: number } = {}): void {
    const ops = [`${(opts.lineWidth ?? 1).toFixed(2)} w`];
    if (opts.fill) ops.push(`${col(opts.fill)} rg`);
    if (opts.stroke) ops.push(`${col(opts.stroke)} RG`);
    ops.push(`${x.toFixed(2)} ${(A4.h - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    ops.push(opts.fill && opts.stroke ? 'B' : opts.fill ? 'f' : 'S');
    this.cur.push(ops.join(' '));
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = [0.85, 0.86, 0.84], width = 1): void {
    this.cur.push(`${width.toFixed(2)} w ${col(color)} RG ${x1.toFixed(2)} ${(A4.h - y1).toFixed(2)} m ${x2.toFixed(2)} ${(A4.h - y2).toFixed(2)} l S`);
  }

  /** Finalise: adds page numbers and a footer to every page, and returns the file. */
  build(footer: string): Buffer {
    const total = this.pages.length;
    this.pages.forEach((p, i) => {
      this.cur = p;
      this.line(this.margin, A4.h - 36, A4.w - this.margin, A4.h - 36);
      this.text(this.margin, A4.h - 30, footer, { size: 7.5, color: [0.42, 0.45, 0.48] });
      this.text(A4.w - this.margin, A4.h - 30, `Page ${i + 1} of ${total}`, { size: 7.5, color: [0.42, 0.45, 0.48], align: 'right' });
    });

    const objs: string[] = [];
    const add = (s: string) => objs.push(s); // object numbers are 1-based, so the new length is the number
    const catalog = add('');
    const pagesObj = add('');
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids: number[] = [];
    for (const p of this.pages) {
      const content = p.join('\n');
      const c = add(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`));
    }
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
    const info = add(`<< /Producer (Magubane Labs) /Title (${esc(toWinAnsi(footer))}) >>`);

    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets: number[] = [];
    objs.forEach((o, i) => {
      offsets.push(Buffer.byteLength(out, 'latin1'));
      out += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xref = Buffer.byteLength(out, 'latin1');
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, 'latin1');
  }
}
