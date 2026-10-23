/**
 * Renders platform text: $inline$ and $$display$$ maths via KaTeX (HTML + MathML for screen readers),
 * **bold**, *italic*, `code`, paragraphs and simple lists. Builds React elements — no raw HTML
 * except KaTeX's own output, which escapes its input (trust: false).
 */
import { memo, type ReactNode } from 'react';
import katex from 'katex';

const texCache = new Map<string, string>();

export function texToHtml(tex: string, display = false): string {
  const key = `${display ? 'D' : 'I'}${tex}`;
  let html = texCache.get(key);
  if (html === undefined) {
    try {
      html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' });
    } catch {
      html = tex.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
    }
    if (texCache.size > 2000) texCache.clear();
    texCache.set(key, html);
  }
  return html;
}

export const Tex = memo(function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const Tag = display ? 'div' : 'span';
  return <Tag className={className ?? (display ? 'tex-display' : 'tex')} dangerouslySetInnerHTML={{ __html: texToHtml(tex, display) }} />;
});

/** Inline: maths, bold, italic, code. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\*\*([^*]+?)\*\*|(?<![*\w])\*([^*\n]+?)\*(?!\*)|`([^`]+?)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1] !== undefined) out.push(<Tex key={k} tex={m[1]} display />);
    else if (m[2] !== undefined) out.push(<Tex key={k} tex={m[2]} />);
    else if (m[3] !== undefined) out.push(<strong key={k}>{inline(m[3], k)}</strong>);
    else if (m[4] !== undefined) out.push(<em key={k}>{m[4]}</em>);
    else if (m[5] !== undefined) out.push(<code key={k}>{m[5]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Inline-only rich text (no paragraphs), for prompts, options and labels. */
export const Rich = memo(function Rich({ text, as: Tag = 'span', className }: { text: string; as?: 'span' | 'p' | 'div'; className?: string }) {
  return <Tag className={className}>{inline(text, 'r')}</Tag>;
});

/** Block rich text: paragraphs, "- " lists, "1. " lists, $$display$$ blocks. Used for lessons and tutor replies. */
type Chunk = { kind: 'p' | 'ul' | 'ol'; lines: string[]; closed?: boolean };

function chunk(text: string): Chunk[] {
  const out: Chunk[] = [];
  for (const block of text.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    for (const raw of block.split('\n')) {
      const line = raw.trimEnd();
      if (!line.trim()) continue;
      const kind: Chunk['kind'] = /^\s*[-•*]\s+/.test(line) ? 'ul' : /^\s*\d+[.)]\s+/.test(line) ? 'ol' : 'p';
      const last = out[out.length - 1];
      if (last && last.kind === kind && !last.closed) last.lines.push(line);
      else out.push({ kind, lines: [line] } as Chunk);
    }
    const last = out[out.length - 1];
    if (last) last.closed = true;
  }
  return out;
}

export const RichBlocks = memo(function RichBlocks({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {chunk(text).map((c, bi) => {
        if (c.kind === 'ul')
          return (
            <ul key={bi}>
              {c.lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-•*]\s+/, ''), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        if (c.kind === 'ol')
          return (
            <ol key={bi}>
              {c.lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*\d+[.)]\s+/, ''), `${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        const t = c.lines.join('\n').trim();
        if (/^\$\$[\s\S]+\$\$$/.test(t) && t.indexOf('$$', 2) === t.length - 2) return <Tex key={bi} tex={t.slice(2, -2)} display />;
        return <p key={bi}>{inline(t, `${bi}`)}</p>;
      })}
    </div>
  );
});
