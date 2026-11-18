// The editor toolbar (ADVENTURE-BOOK-PLAN.md §16). Shown only when the Colony API answers; the editor
// itself (CodeMirror) loads on first use.

// The book is served through the app (http://localhost:4200/docs/, where /api is proxied) or on its
// own port (4321-4323, where the API is called directly; the API allows those origins).
export const API = location.port === '4200' ? '/api' : 'http://localhost:5000/api';
export const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

export async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const err = new Error(data?.message ?? (typeof data === 'string' ? data : `${res.status} ${res.statusText}`));
    err.status = res.status;
    throw err;
  }
  return data;
}

export function initToolbar() {
  const bar = document.querySelector('.rp-editbar');
  if (!bar) return;
  const { source, newType, newDir } = bar.dataset;
  // Only offer editing when the API is there (and the source file is one it can open).
  const probe = source ? api('GET', `/content/file?path=${encodeURIComponent(source)}`) : api('GET', '/canon/status');
  probe.then(() => (bar.hidden = false)).catch(() => {});
  bar.addEventListener('click', async (ev) => {
    const action = ev.target.closest('button')?.dataset.action;
    if (!action) return;
    const editor = await import('./editor.js');
    if (action === 'edit') editor.openEdit(source);
    if (action === 'new') editor.openNew(newType, newDir);
    if (action === 'delete') editor.confirmDelete(source);
  });
}
