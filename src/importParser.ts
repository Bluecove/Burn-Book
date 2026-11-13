export interface ImportRow {
  title: string;
  group: string;
  description: string;
}

/**
 * Turns pasted text or a CSV file into pieces. Each line is one piece:
 * `Title`, `Title, Group` or `Title, Group, Description`. Tabs (pasted from a
 * spreadsheet) work like commas, and quotes can wrap names containing commas.
 * A header line starting with "title" or "name" is ignored.
 */
export function parseImport(text: string): ImportRow[] {
  const seen = new Set<string>();
  const out: ImportRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cols = splitLine(line).map((c) => c.trim());
    const title = cols[0] ?? '';
    if (!title || /^(title|name)$/i.test(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, group: cols[1] ?? '', description: cols.slice(2).join(', ').trim() });
  }
  return out;
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && quoted && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if ((c === ',' || c === '\t') && !quoted) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}
