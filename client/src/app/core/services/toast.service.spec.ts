// Import confirmation toasts: the message, and counting each row only once its save has succeeded.
import { ToastService, ImportTally, importSummary } from './toast.service';

describe('import toasts', () => {
  it('lists only non-zero counts, in a fixed order', () => {
    expect(importSummary({ added: 2, replaced: 3, skipped: 0 })).toBe('3 replaced, 2 added');
    expect(importSummary({ removed: 1, imported: 4, failed: 1 })).toBe('4 imported, 1 removed, 1 failed');
    expect(importSummary({})).toBe('nothing to import');
  });

  it('counts a row under its kind when saved, as failed when not, and warns on failures', async () => {
    const toast = new ToastService(), tally = new ImportTally();
    tally.track('replaced', Promise.resolve(true));
    tally.track('replaced', Promise.resolve(false));
    tally.track('added', Promise.resolve({ id: 'x' }));     // an API result: success
    tally.track('added', Promise.reject(new Error('500')));
    tally.count('skipped', 2);
    await tally.report(toast, 'Characters');
    expect(toast.toasts()).toEqual([{ id: 1, kind: 'warning', title: 'Import finished with errors',
      detail: 'Characters: 1 replaced, 1 added, 2 skipped, 2 failed' }]);
  });

  it('a clean import is "Import Successful"', async () => {
    const toast = new ToastService(), tally = new ImportTally();
    tally.track('added', Promise.resolve(true));
    await tally.report(toast, 'Assets');
    expect(toast.toasts()[0]).toMatchObject({ kind: 'success', title: 'Import Successful', detail: 'Assets: 1 added' });
  });
});
