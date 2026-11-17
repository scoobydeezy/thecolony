import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'warning';
export interface Toast { id: number; title: string; detail: string; kind: ToastKind }

/** Counts from one import. Zero counts are left out of the message. */
export interface ImportCounts { replaced?: number; added?: number; imported?: number; removed?: number; skipped?: number; failed?: number }

/** "3 replaced, 2 added, 1 skipped". Order is fixed; zero counts are omitted. */
export function importSummary(c: ImportCounts): string {
  const parts = ([['replaced', c.replaced], ['added', c.added], ['imported', c.imported], ['removed', c.removed],
                  ['skipped', c.skipped], ['failed', c.failed]] as const)
    .filter(([, n]) => (n ?? 0) > 0).map(([label, n]) => `${n} ${label}`);
  return parts.length ? parts.join(', ') : 'nothing to import';
}

/** Short-lived confirmations, e.g. after an import. Errors keep using the app's error banner. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private next = 0;

  show(title: string, detail: string, kind: ToastKind = 'success', ms = 5000): void {
    const id = ++this.next;
    this.toasts.update(t => [...t, { id, title, detail, kind }]);
    setTimeout(() => this.dismiss(id), ms);
  }

  /** The import confirmation: "Import Successful – 3 replaced, 2 added", or a warning when some rows failed. */
  imported(what: string, c: ImportCounts): void {
    const failed = (c.failed ?? 0) > 0;
    this.show(failed ? 'Import finished with errors' : 'Import Successful', `${what}: ${importSummary(c)}`,
              failed ? 'warning' : 'success', failed ? 8000 : 5000);
  }

  dismiss(id: number): void { this.toasts.update(t => t.filter(x => x.id !== id)); }
}

type CountKind = Exclude<keyof ImportCounts, 'failed'>;

/** Counts one import: rows are counted under their kind once their save succeeds; a failed save counts as "failed". */
export class ImportTally {
  private readonly counts: Required<ImportCounts> = { replaced: 0, added: 0, imported: 0, removed: 0, skipped: 0, failed: 0 };
  private readonly pending: Promise<void>[] = [];

  /** A row handled without a save (e.g. skipped because its faction or character is unknown). */
  count(kind: CountKind, n = 1): void { this.counts[kind] += n; }

  /** A row whose save resolves to success (true) or failure (false). */
  track(kind: CountKind, save: Promise<boolean> | Promise<unknown>): void {
    this.pending.push(Promise.resolve(save).then(
      ok => { if (ok === false) this.counts.failed++; else this.counts[kind]++; },
      () => { this.counts.failed++; }));
  }

  /** Waits for every save, then shows the confirmation toast. */
  async report(toast: ToastService, what: string): Promise<void> {
    await Promise.all(this.pending);
    toast.imported(what, this.counts);
  }
}
