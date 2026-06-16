// Parse a CSV string into rows of string values.
// Handles quoted fields, embedded commas, and escaped double-quotes ("").
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  // Normalize line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let pos = 0;

  while (pos < lines.length) {
    const row: string[] = [];
    while (true) {
      if (lines[pos] === '"') {
        // Quoted field
        pos++; // skip opening quote
        let field = '';
        while (pos < lines.length) {
          if (lines[pos] === '"' && lines[pos + 1] === '"') {
            field += '"';
            pos += 2;
          } else if (lines[pos] === '"') {
            pos++; // skip closing quote
            break;
          } else {
            field += lines[pos++];
          }
        }
        row.push(field);
      } else {
        // Unquoted field: read until comma or newline
        let field = '';
        while (pos < lines.length && lines[pos] !== ',' && lines[pos] !== '\n') {
          field += lines[pos++];
        }
        row.push(field);
      }
      if (pos >= lines.length || lines[pos] === '\n') {
        pos++; // skip newline
        break;
      }
      pos++; // skip comma
    }
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

// Build a header-index map from a parsed header row (case-insensitive lookup).
export function csvHeaderMap(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((h, i) => map.set(h.toLowerCase(), i));
  return map;
}

export function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function downloadCsv(rows: unknown[][], filename: string): void {
  const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
