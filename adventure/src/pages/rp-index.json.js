// The editor's index (ADVENTURE-BOOK-PLAN.md §16): every entry's id, name, type, source file and URL,
// for autocomplete and link checks in the browser, plus the folders new entries and pages go into.
import path from 'node:path';
import { loadRegistry, entityUrl, ENTITY_TYPES, CONTENT_DIR, loadParts } from '../lib/registry.mjs';

export function GET() {
  const reg = loadRegistry({ fresh: true });
  const entries = [...reg.byId.values()].map((e) => ({
    id: e.data.id,
    name: e.view?.fullName ?? e.view?.name ?? e.data.name ?? e.data.id,
    type: e.type,
    file: e.type === 'path' ? null : path.relative(CONTENT_DIR, e.file).split(path.sep).join('/'),
    url: entityUrl(e),
  }));
  const types = Object.entries(ENTITY_TYPES).map(([type, spec]) => ({ type, label: spec.label, dir: spec.dir }));
  const parts = loadParts().map((p) => ({ id: p.id, dir: p.dir, title: p.title, chapters: p.chapters.map((c) => ({ key: c.key, title: c.title })) }));
  return new Response(JSON.stringify({ entries, types, parts }), { headers: { 'Content-Type': 'application/json' } });
}
