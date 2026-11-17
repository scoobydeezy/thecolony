import { zipBytes } from './zip';

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

// Build a header-index map from a parsed header row (case-insensitive lookup). A byte-order mark (spreadsheet apps add one
// when saving UTF-8 CSV) and surrounding spaces are ignored, so "\uFEFFId" still finds the Id column.
export function csvHeaderMap(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((h, i) => map.set(h.replace(/^\uFEFF/, '').trim().toLowerCase(), i));
  return map;
}

export function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map(row => row.map(escapeCsv).join(',')).join('\n');
}

/** Save a Blob. The URL is revoked a minute later, not at once: a save dialog ("ask where to save") reads it only after
 *  the user picks a location, and revoking immediately can cancel the download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadCsv(rows: unknown[][], filename: string): void {
  downloadBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }), filename);
}

/** Several CSV files as ONE download (a .zip): browsers allow one download per click, so separate files after the first
 *  are refused. Each file inside is the same CSV the single-file export writes, ready to import after unzipping. */
export function downloadCsvZip(files: { name: string; rows: unknown[][] }[], zipName: string): void {
  downloadBlob(new Blob([zipBytes(files.map(f => ({ name: f.name, data: toCsv(f.rows) })))], { type: 'application/zip' }), zipName);
}
