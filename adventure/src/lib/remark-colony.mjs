// The book's portable markup. Everything authors write beyond plain Markdown is
// a directive handled here, so chapters, entity bodies and the reference export
// share one implementation, and unrendered source still reads as text.
//
//   Blocks   :::read-aloud  :::player-facing  :::secret  :::gm-note  :::design  :::branch[Label]
//   Leaf     ::clock[Label]{segments=12 note="..."}    ::embed{#entity.id}    ::part-contents (on a part page)
//   Inline   :ref[Text]{#entity.id}   :stat{#source.id key=backlash}   :cite[Label]{doc=encounters anchor=...}
import { visit, SKIP } from 'unist-util-visit';
import { BLOCKS, TEXT_DIRECTIVES, LEAF_DIRECTIVES, directiveId, parseMarkdownBody } from './markup.mjs';
export { BLOCKS, TEXT_DIRECTIVES, LEAF_DIRECTIVES, directiveId, parseMarkdownBody };
import { loadRegistry, entityUrl, ENTITY_TYPES, loadParts, partChapters } from './registry.mjs';
import { statText } from './veiled.mjs';
import { statblockHast } from './statblock.mjs';
import { h } from './hast.mjs';
import { BASE } from './target.mjs';
import { directoryHast } from './directory.mjs';

const MAX_EMBED_DEPTH = 2;
const ARRANGEMENT = {
  sequence: 'In order.',
  alternatives: 'Alternatives, chosen by the Colony state and the players; usually only some are played.',
  optional: 'Optional and independent, in any order.',
  concurrent: 'At the same time, independently: each has its own deadline, and some may be delegated or ignored.',
  reference: 'Available at any point in the act.',
};

const hastNode = (hast) => ({ type: 'rpHast', children: [], data: { hName: 'div', hProperties: { className: ['rp-generated'] }, hChildren: [hast] } });
const labelPara = (children) => ({ type: 'paragraph', children, data: { hProperties: { className: ['rp-label'] } } });

export default function remarkColony({ target = 'gm' } = {}) {
  return (tree, file) => {
    const reg = loadRegistry();
    const warn = (msg, node) => file.message(msg, node, 'colony');

    visit(tree, (node, index, parent) => {
      // ---------- audience / structure blocks ----------
      if (node.type === 'containerDirective' && BLOCKS[node.name]) {
        const spec = BLOCKS[node.name];
        if (spec.audience === 'designer' && target !== 'designer') {
          parent.children.splice(index, 1);
          return [SKIP, index];
        }
        const first = node.children[0];
        const labelled = first?.data?.directiveLabel;
        if (labelled) node.children.shift();
        // §14: :::branch{when=path.a path.b} names the paths it holds on; the label comes from the branch file.
        const when = node.name === 'branch' && node.attributes?.when ? String(node.attributes.when).split(/[\s,]+/).filter(Boolean) : [];
        if (when.length) {
          const names = when.map((id) => {
            const p = reg.byId.get(id);
            if (!p || p.type !== 'path') warn(`:::branch names an unknown path ${id}`, node);
            return p?.type === 'path' ? p.view.name : `${id} (missing)`;
          });
          node.children.unshift(labelPara([{ type: 'text', value: `If ${names.join(' and ')}${labelled ? ': ' : ''}` }, ...(labelled ? first.children : [])]));
        } else
        node.children.unshift(labelPara(labelled ? [{ type: 'text', value: `${spec.label}: ` }, ...first.children] : [{ type: 'text', value: spec.label }]));
        node.data = {
          hName: spec.tag,
          hProperties: {
            ...(when.length ? { 'data-paths': when.join(' ') } : {}),
            className: ['rp-block', `rp-${node.name}`],
            'data-audience': spec.audience,
            ...(spec.audience === 'designer' ? { 'data-private': 'designer' } : {}),
          },
        };
        return;
      }

      // ---------- directories generated from canonical baseline records ----------
      if (node.type === 'leafDirective' && node.name === 'directory') {
        try {
          parent.children.splice(index, 1, hastNode(directoryHast(reg, node.attributes ?? {})));
        } catch (err) {
          warn(err.message, node);
          parent.children.splice(index, 1);
        }
        return [SKIP, index + 1];
      }

      // ---------- clocks ----------
      if (node.type === 'leafDirective' && node.name === 'clock') {
        const segments = Number(node.attributes?.segments);
        if (!Number.isInteger(segments) || segments < 1 || segments > 24) warn(`::clock needs segments=1..24`, node);
        const n = Number.isInteger(segments) && segments > 0 ? Math.min(segments, 24) : 4;
        const label = node.children.length ? node.children : [{ type: 'text', value: 'Clock' }];
        node.children = [
          labelPara([{ type: 'text', value: 'Clock: ' }, ...label]),
          hastNode(h('ol', { className: ['rp-clock-track'], 'aria-label': `${n} segments` }, Array.from({ length: n }, (_, i) => h('li', {}, String(i + 1))))),
          ...(node.attributes?.note ? [{ type: 'paragraph', children: [{ type: 'text', value: node.attributes.note }], data: { hProperties: { className: ['rp-clock-note'] } } }] : []),
        ];
        node.data = { hName: 'div', hProperties: { className: ['rp-block', 'rp-clock'], 'data-audience': 'gm', 'data-segments': n } };
        return;
      }

      // ---------- a part page's chapters and their events / encounters (§13) ----------
      if (node.type === 'leafDirective' && node.name === 'part-contents') {
        const partId = file.data?.astro?.frontmatter?.part?.id;
        const part = loadParts().find((p) => p.id === partId);
        if (!part) {
          warn('::part-contents is only for a part page (frontmatter part.id)', node);
          parent.children.splice(index, 1);
          return [SKIP, index];
        }
        const chapters = partChapters(reg, part).map((s) =>
          h('section', { className: ['rp-part-chapter', `rp-${s.arrangement}`] }, [
            h('h2', { id: s.key }, s.title),
            h('p', { className: ['rp-muted'] }, ARRANGEMENT[s.arrangement]),
            h(s.arrangement === 'sequence' ? 'ol' : 'ul', { className: ['rp-entity-list'] }, s.items.map((e) =>
              h('li', {}, [
                h('a', { href: entityUrl(e) }, e.view.name),
                h('span', { className: ['rp-muted'] }, ` · ${ENTITY_TYPES[e.type].label}${e.data.route ? ` · ${e.data.route}` : ''}${e.data.status === 'stub' ? ' · not yet written' : ''}`),
                ...(e.data.summary ? [h('br', {}, []), h('span', {}, e.data.summary)] : []),
                ...(e.pages?.length ? [h('ul', {}, e.pages.map((p) => h('li', {}, h('a', { href: `${BASE}/${part.dir}/${p.slug}/` }, p.label))))] : []),
              ]),
            )),
          ]),
        );
        parent.children.splice(index, 1, ...chapters.map(hastNode));
        return [SKIP, index + chapters.length];
      }

      // ---------- inline an entity (rule text, stat block + abilities) ----------
      if (node.type === 'leafDirective' && node.name === 'embed') {
        const id = directiveId(node);
        const entity = id && reg.byId.get(id);
        const depth = node.data?.rpEmbedDepth ?? 0;
        if (!entity || depth >= MAX_EMBED_DEPTH) {
          warn(entity ? `::embed nested too deeply (${id})` : `Unknown entity in ::embed: ${id}`, node);
          node.children = [{ type: 'text', value: `[missing reference: ${id}]` }];
          node.data = { hName: 'p', hProperties: { className: ['rp-ref-missing'] } };
          return;
        }
        const body = parseMarkdownBody(entity.body || '');
        visit(body, 'leafDirective', (n) => {
          if (n.name === 'embed') n.data = { ...(n.data ?? {}), rpEmbedDepth: depth + 1 };
        });
        const url = entityUrl(entity);
        const kind = ENTITY_TYPES[entity.type].label;
        const head = labelPara([
          { type: 'text', value: `${kind}: ` },
          url ? { type: 'link', url, children: [{ type: 'text', value: entity.view.name }] } : { type: 'text', value: entity.view.name },
          ...(entity.data.version ? [{ type: 'text', value: ` (v${entity.data.version})` }] : []),
        ]);
        node.children = [head, ...(entity.type === 'creature' ? [hastNode(statblockHast(entity.view))] : []), ...body.children];
        node.data = { hName: 'div', hProperties: { className: ['rp-embed', `rp-embed-${entity.type}`], 'data-ref': id } };
        return;
      }

      if (node.type !== 'textDirective' || !TEXT_DIRECTIVES.includes(node.name)) return;

      // ---------- citations into the original source documents (designer only) ----------
      if (node.name === 'cite') {
        if (target !== 'designer') {
          parent.children.splice(index, 1);
          return [SKIP, index];
        }
        const { doc, anchor } = node.attributes ?? {};
        node.data = {
          hName: 'a',
          hProperties: { className: ['rp-cite'], href: `${BASE}/designer/source-docs/${doc}/${anchor ? `#${anchor}` : ''}`, 'data-private': 'designer' },
        };
        if (!node.children.length) node.children = [{ type: 'text', value: `${doc}${anchor ? ` §${anchor}` : ''}` }];
        return;
      }

      const id = directiveId(node);
      const entity = id && reg.byId.get(id);

      // ---------- derived Veiled values ----------
      if (node.name === 'stat') {
        let text;
        try {
          if (!entity) throw new Error(`unknown Source ${id}`);
          text = statText(entity.data, node.attributes?.key);
        } catch (err) {
          warn(`:stat ${err.message}`, node);
          text = `[missing stat: ${id} ${node.attributes?.key ?? ''}]`;
        }
        node.data = { hName: 'span', hProperties: { className: ['rp-stat'], 'data-ref': id }, hChildren: [{ type: 'text', value: text }] };
        return;
      }

      // ---------- cross-references ----------
      if (!entity) {
        warn(`Unknown reference: ${id}`, node);
        node.data = { hName: 'span', hProperties: { className: ['rp-ref-missing'], title: `Unknown reference ${id}` } };
        if (!node.children.length) node.children = [{ type: 'text', value: id ?? '?' }];
        return;
      }
      const url = entityUrl(entity);
      node.data = {
        hName: url ? 'a' : 'span',
        hProperties: { className: ['rp-ref', `rp-ref-${entity.type}`], 'data-ref': id, ...(url ? { href: url } : {}) },
      };
      if (!node.children.length) node.children = [{ type: 'text', value: entity.view.name }];
    });
  };
}
