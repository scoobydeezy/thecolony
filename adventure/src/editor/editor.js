// The book's in-browser editor (ADVENTURE-BOOK-PLAN.md §16). Edits a whole content file in two panes,
// frontmatter (YAML) and body (Markdown), and saves it through the Colony API, which validates it and
// writes the one source file the book and the app both read. After a save the book rebuilds and the page
// reloads; if the build fails, its errors are shown here.
//
// Before a save, the same checks the build makes run here: the YAML must parse, and the markup must use
// known blocks and directives (src/lib/markup.mjs). References to entries that don't exist are warnings,
// as in the build. The schema, the id rules and the version check run on the server.
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { yaml as yamlLanguage } from '@codemirror/lang-yaml';
import { autocompletion } from '@codemirror/autocomplete';
import yaml from 'js-yaml';
import { visit } from 'unist-util-visit';
import { BLOCKS, TEXT_DIRECTIVES, LEAF_DIRECTIVES, directiveId, parseMarkdownBody } from '../lib/markup.mjs';
import { api, BASE } from './toolbar.js';

const ASIDES = ['note', 'tip', 'caution', 'danger'];

// ---------------------------------------------------------------- the index (ids, names, URLs)

let indexPromise = null;
function loadIndex(fresh = false) {
  if (!indexPromise || fresh) indexPromise = fetch(`${BASE}/rp-index.json?t=${Date.now()}`).then((r) => r.json()).catch(() => ({ entries: [], types: [], chapters: [] }));
  return indexPromise;
}

// ---------------------------------------------------------------- file text <-> panes

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const isMarkdown = (path) => path.endsWith('.md');

function split(path, text) {
  if (!isMarkdown(path)) return { fm: text.replace(/\n$/, ''), body: null };
  const m = text.match(FRONTMATTER);
  return m ? { fm: m[1], body: m[2] } : { fm: '', body: text };
}

const join = (path, fm, body) => (isMarkdown(path) ? `---\n${fm.replace(/\n+$/, '')}\n---\n${body}` : `${fm.replace(/\n+$/, '')}\n`);

// ---------------------------------------------------------------- checks before a save

function check(fm, body, index) {
  const errors = [];
  const warnings = [];
  try {
    const data = yaml.load(fm);
    if (data !== undefined && (typeof data !== 'object' || Array.isArray(data))) errors.push('The frontmatter must be a YAML mapping (key: value lines).');
  } catch (e) {
    errors.push(`Frontmatter: ${e.reason ?? e.message}${e.mark ? ` (line ${e.mark.line + 1})` : ''}`);
  }
  if (body !== null) {
    const known = new Set(index.entries.map((e) => e.id));
    let tree;
    try {
      tree = parseMarkdownBody(body);
    } catch (e) {
      errors.push(`Body: ${e.message}`);
    }
    if (tree)
      visit(tree, (node) => {
        if (!node.type?.endsWith('Directive')) return;
        const line = node.position?.start.line ?? '?';
        const name = node.name;
        if (node.type === 'containerDirective') {
          if (!BLOCKS[name] && !ASIDES.includes(name)) errors.push(`Body line ${line}: unknown block :::${name}`);
          if (name === 'branch' && node.attributes?.when)
            for (const id of String(node.attributes.when).split(/[\s,]+/).filter(Boolean)) if (!known.has(id)) warnings.push(`Body line ${line}: :::branch names an unknown path ${id}`);
          return;
        }
        if (node.type === 'leafDirective' && !LEAF_DIRECTIVES.includes(name)) return void errors.push(`Body line ${line}: unknown directive ::${name}`);
        if (node.type === 'textDirective' && !TEXT_DIRECTIVES.includes(name)) {
          if (node.attributes && Object.keys(node.attributes).length) errors.push(`Body line ${line}: unknown directive :${name}`);
          return;
        }
        if (name === 'cite' || name === 'clock' || name === 'part-contents' || name === 'directory') return;
        const id = directiveId(node);
        if (!id) return void errors.push(`Body line ${line}: :${name} needs an #id`);
        if (!known.has(id)) warnings.push(`Body line ${line}: :${name} → ${id} is not an entry (it will show as missing)`);
      });
  }
  return { errors, warnings };
}

// ---------------------------------------------------------------- autocomplete

function completions(index, body) {
  return (context) => {
    // Directive names after ":", "::" or ":::" at the start of a word (body only).
    if (body) {
      const d = context.matchBefore(/(^|\s):{1,3}[a-z-]*$/);
      if (d) {
        const colons = d.text.trim().match(/^:+/)[0].length;
        const names = colons === 3 ? [...Object.keys(BLOCKS), ...ASIDES] : colons === 2 ? LEAF_DIRECTIVES : TEXT_DIRECTIVES;
        return { from: d.from + d.text.indexOf(':') + colons, options: names.map((n) => ({ label: n, type: 'keyword' })) };
      }
    }
    // Entry ids: after "#" in a directive, or an id-looking word (type.slug) anywhere.
    const w = context.matchBefore(/#?[a-z]+\.[a-z0-9.-]*$/) ?? (context.explicit ? context.matchBefore(/#?[a-z0-9.-]*$/) : null);
    if (!w) return null;
    const hash = w.text.startsWith('#') ? 1 : 0;
    return {
      from: w.from + hash,
      options: index.entries.map((e) => ({ label: e.id, detail: e.name, type: 'variable' })),
      validFor: /^[a-z0-9.-]*$/,
    };
  };
}

// ---------------------------------------------------------------- the dialog

const CSS = `
.rp-ed { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; background: var(--sl-color-bg, #111); color: var(--sl-color-white, #eee); }
.rp-ed header { display: flex; gap: .5rem; align-items: center; padding: .5rem 1rem; border-bottom: 1px solid var(--sl-color-gray-5, #444); }
.rp-ed header .rp-ed-path { flex: 1; font-family: var(--__sl-font-mono, monospace); font-size: .85rem; opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-ed button { padding: .25rem .8rem; border-radius: .4rem; border: 1px solid var(--sl-color-gray-5, #555); background: var(--sl-color-gray-6, #222); color: inherit; cursor: pointer; }
.rp-ed button.rp-primary { background: var(--sl-color-accent, #36c); border-color: var(--sl-color-accent, #36c); color: var(--sl-color-black, #000); }
.rp-ed button:disabled { opacity: .5; cursor: default; }
.rp-ed .rp-ed-notes { padding: 0 1rem; font-size: .85rem; max-height: 30vh; overflow: auto; }
.rp-ed .rp-ed-notes p { margin: .35rem 0; }
.rp-ed .rp-err { color: var(--sl-color-red-high, #f88); }
.rp-ed .rp-warn { color: var(--sl-color-orange-high, #fb6); }
.rp-ed .rp-ok { color: var(--sl-color-green-high, #8d8); }
.rp-ed .rp-ed-panes { flex: 1; display: grid; grid-template-rows: minmax(6rem, 35%) 1fr; min-height: 0; }
.rp-ed .rp-ed-panes.rp-single { grid-template-rows: 1fr; }
.rp-ed .rp-ed-pane { display: flex; flex-direction: column; min-height: 0; border-top: 1px solid var(--sl-color-gray-5, #444); }
.rp-ed .rp-ed-pane > span { padding: .2rem 1rem; font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; opacity: .7; }
.rp-ed .rp-ed-pane .cm-editor { flex: 1; min-height: 0; background: var(--sl-color-gray-7, #181818); }
.rp-ed .rp-ed-pane .cm-scroller { font-family: var(--__sl-font-mono, monospace); font-size: .85rem; }
.rp-ed .cm-gutters { background: transparent; border-right: 1px solid var(--sl-color-gray-5, #444); color: var(--sl-color-gray-3, #888); }
.rp-ed .cm-activeLine, .rp-ed .cm-activeLineGutter { background: rgba(127,127,127,.08); }
.rp-ed .cm-cursor { border-left-color: var(--sl-color-white, #eee); }
.rp-ed .cm-tooltip { background: var(--sl-color-gray-6, #222); color: inherit; border: 1px solid var(--sl-color-gray-5, #555); }
.rp-ed .cm-tooltip-autocomplete ul li[aria-selected] { background: var(--sl-color-accent, #36c); color: var(--sl-color-black, #000); }
`;

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined) e.append(c);
  return e;
}

function notes(box, items) {
  box.replaceChildren(...items.map(([cls, text]) => el('p', { class: cls }, text)));
}

// Wait for a book build that started after `since` to finish (scripts/serve.mjs, /docs/__build).
// A server without that endpoint (one started before it existed, or `astro dev`): wait until `changed()`
// says the rebuilt output is there, for up to a minute; build errors can't be reported then.
async function waitForBuild(since, changed) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 180; i++) {
    await sleep(700);
    let s = null;
    try {
      const res = await fetch(`${BASE}/__build?t=${Date.now()}`);
      if (res.ok && res.headers.get('content-type')?.includes('json')) s = await res.json();
    } catch {}
    if (!s) {
      for (let j = 0; j < 85; j++) {
        if (await changed().catch(() => false)) return { ok: true };
        await sleep(700);
      }
      return { ok: true, unknown: true };
    }
    if (s.startedAt >= since && !s.building && s.finishedAt >= s.startedAt) return s;
  }
  return { ok: false, errors: ['The book did not finish rebuilding within two minutes. Check the terminal running the book.'] };
}

const pageText = async (url) => (await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`)).text();

async function open({ path, text, version, create }) {
  if (!document.getElementById('rp-ed-css')) document.head.append(el('style', { id: 'rp-ed-css' }, CSS));
  const index = await loadIndex();
  const parts = split(path, text);
  let saved = { version, create };
  let dirty = false;
  const markDirty = () => (dirty = true);

  const box = el('div', { class: 'rp-ed-notes', role: 'status', 'aria-live': 'polite' });
  const saveBtn = el('button', { type: 'button', class: 'rp-primary' }, create ? 'Create' : 'Save');
  const closeBtn = el('button', { type: 'button' }, 'Close');
  const fmHost = el('div', { class: 'rp-ed-pane' }, el('span', {}, isMarkdown(path) ? 'Frontmatter (YAML)' : 'Data (YAML)'));
  const bodyHost = parts.body === null ? null : el('div', { class: 'rp-ed-pane' }, el('span', {}, 'Body (Markdown)'));
  const dialog = el(
    'div',
    { class: 'rp-ed', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Edit ${path}` },
    el('header', {}, el('span', { class: 'rp-ed-path' }, create ? `New: ${path}` : path), saveBtn, closeBtn),
    box,
    el('div', { class: `rp-ed-panes${bodyHost ? '' : ' rp-single'}` }, fmHost, bodyHost),
  );
  document.body.append(dialog);
  document.documentElement.style.overflow = 'hidden';

  const listener = EditorView.updateListener.of((u) => u.docChanged && markDirty());
  const fmView = new EditorView({ doc: parts.fm, parent: fmHost, extensions: [basicSetup, yamlLanguage(), EditorView.lineWrapping, autocompletion({ override: [completions(index, false)] }), listener] });
  const bodyView = bodyHost
    ? new EditorView({ doc: parts.body, parent: bodyHost, extensions: [basicSetup, markdown(), EditorView.lineWrapping, autocompletion({ override: [completions(index, true)] }), listener] })
    : null;
  (bodyView ?? fmView).focus();

  const guard = (e) => {
    if (dirty) e.preventDefault();
  };
  window.addEventListener('beforeunload', guard);
  const close = () => {
    if (dirty && !confirm('Discard your unsaved changes?')) return;
    window.removeEventListener('beforeunload', guard);
    fmView.destroy();
    bodyView?.destroy();
    dialog.remove();
    document.documentElement.style.overflow = '';
  };
  closeBtn.addEventListener('click', close);
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveBtn.click();
    }
  });

  saveBtn.addEventListener('click', async () => {
    const fm = fmView.state.doc.toString();
    const body = bodyView ? bodyView.state.doc.toString() : null;
    const { errors, warnings } = check(fm, body, index);
    if (errors.length) return notes(box, [...errors.map((e) => ['rp-err', e]), ...warnings.map((w) => ['rp-warn', w])]);
    saveBtn.disabled = true;
    notes(box, [['', 'Saving…'], ...warnings.map((w) => ['rp-warn', w])]);
    const since = Date.now();
    const before = create ? null : await pageText(location.pathname).catch(() => null);
    let result;
    try {
      result = await api('PUT', '/content/file', { path, text: join(path, fm, body ?? ''), version: saved.version, create: saved.create });
    } catch (e) {
      saveBtn.disabled = false;
      const msg = e.status === 409 ? `${e.message} Close the editor and reload the page to see the current version (copy your changes first).` : e.message;
      return notes(box, [['rp-err', msg], ...warnings.map((w) => ['rp-warn', w])]);
    }
    saved = { version: result.version, create: false };
    dirty = false;
    saveBtn.textContent = 'Save';
    notes(box, [['rp-ok', 'Saved. The app reads it now; the book is rebuilding…'], ...warnings.map((w) => ['rp-warn', w])]);
    const docsUrl = result.path.startsWith('docs/') ? `${BASE}/${result.path.slice(5).replace(/(index)?\.md$/, '')}` : null;
    const build = await waitForBuild(since, async () =>
      !create ? (await pageText(location.pathname)) !== before
        : docsUrl ? (await fetch(docsUrl)).ok
        : (await loadIndex(true)).entries.some((e) => e.file === result.path));
    saveBtn.disabled = false;
    if (!build.ok) return notes(box, [['rp-err', 'Saved, but the book failed to build (it still shows the last good version). Fix the problem and save again:'], ...(build.errors ?? []).map((e) => ['rp-err', e])]);
    window.removeEventListener('beforeunload', guard);
    // A new entry: go to its page (or its section) once the index knows its URL.
    if (create) {
      const fresh = await loadIndex(true);
      const entry = fresh.entries.find((e) => e.file === result.path);
      location.href = entry?.url ?? docsUrl ?? location.href;
    } else location.reload();
  });
}

// ---------------------------------------------------------------- entry points

export async function openEdit(path) {
  try {
    const f = await api('GET', `/content/file?path=${encodeURIComponent(path)}`);
    await open({ path: f.path, text: f.text, version: f.version, create: false });
  } catch (e) {
    alert(`Can't open ${path}: ${e.message}`);
  }
}

export async function openNew(type, dir) {
  const index = await loadIndex();
  const label = type === 'docs' ? 'page' : (index.types.find((t) => t.type === type)?.label ?? type).toLowerCase();
  const name = prompt(`Name of the new ${label}:`);
  if (!name?.trim()) return;
  try {
    const t = await api('POST', '/content/new', { type, name: name.trim(), dir: dir || undefined });
    await open({ path: t.path, text: t.text, version: null, create: true });
  } catch (e) {
    alert(`Can't start a new ${label}: ${e.message}`);
  }
}

export async function confirmDelete(path) {
  let f;
  try {
    f = await api('GET', `/content/file?path=${encodeURIComponent(path)}`);
  } catch (e) {
    return alert(`Can't open ${path}: ${e.message}`);
  }
  const what = f.id ?? f.path;
  if (!confirm(`Delete ${what}?\n\nThe file is deleted (and, for an entry the app tracks, its record in every campaign). Anything that refers to it keeps the reference, flagged as missing. This can't be undone here.`)) return;
  const since = Date.now();
  const before = await pageText(location.pathname).catch(() => null);
  try {
    await api('DELETE', `/content/file?path=${encodeURIComponent(f.path)}&version=${f.version}`);
  } catch (e) {
    return alert(`Not deleted: ${e.message}`);
  }
  let flagged = 0;
  try {
    const s = await api('GET', '/canon/status');
    flagged = (s.staleReferences ?? []).filter((r) => r.to === f.id).length;
  } catch {}
  await waitForBuild(since, async () => (await pageText(location.pathname)) !== before);
  if (flagged) alert(`Deleted. ${flagged} reference(s) to ${what} are now flagged as missing (see Stale references).`);
  // Up one level: the section index, or the chapter.
  location.href = location.pathname.replace(/[^/]+\/$/, '') || `${BASE}/`;
}
