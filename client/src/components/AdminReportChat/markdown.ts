/**
 * Tiny markdown → HTML renderer for chat bot replies.
 *
 * Supports: # / ## / ### headings, **bold**, *italic*, `code`, - / 1. lists,
 * GFM-style pipe tables, paragraphs, line breaks. All input is HTML-escaped
 * first, so this is safe to dangerouslySetInnerHTML in the chat bubble.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(text: string): string {
  let out = text;
  // code spans
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // bold then italic
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return out;
}

function renderTable(lines: string[], start: number): { html: string; consumed: number } {
  const header = lines[start];
  const sep = lines[start + 1];
  if (!sep || !/^\s*\|?[\s:|-]+\|?\s*$/.test(sep)) {
    return { html: '', consumed: 0 };
  }
  const cells = (row: string) =>
    row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const headers = cells(header);
  const rows: string[][] = [];
  let i = start + 2;
  while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
    rows.push(cells(lines[i]));
    i++;
  }
  const thead = `<thead><tr>${headers.map((h) => `<th>${inline(escapeHtml(h))}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${inline(escapeHtml(c))}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;
  return { html: `<table>${thead}${tbody}</table>`, consumed: i - start };
}

export function renderMarkdown(src: string): string {
  if (!src) return '';
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let listType: 'ul' | 'ol' | null = null;
  const paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(escapeHtml(paragraph.join(' ')))}</p>`);
      paragraph.length = 0;
    }
  };

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      closeList();
      i++;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushParagraph();
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(escapeHtml(h[2]))}</h${level}>`);
      i++;
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      flushParagraph();
      closeList();
      const { html, consumed } = renderTable(lines, i);
      if (consumed > 0) {
        out.push(html);
        i += consumed;
        continue;
      }
    }

    // Unordered list
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      flushParagraph();
      if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${inline(escapeHtml(ul[1]))}</li>`);
      i++;
      continue;
    }

    // Ordered list
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      flushParagraph();
      if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${inline(escapeHtml(ol[1]))}</li>`);
      i++;
      continue;
    }

    closeList();
    paragraph.push(line);
    i++;
  }

  flushParagraph();
  closeList();

  return out.join('\n');
}
