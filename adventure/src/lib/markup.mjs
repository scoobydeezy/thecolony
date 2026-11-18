// The book's markup vocabulary and parser, with no Node dependencies, so the same rules run in the
// build (remark-colony, validate.mjs) and in the browser (the editor's checks before a save).
import { fromMarkdown } from 'mdast-util-from-markdown';
import { directive } from 'micromark-extension-directive';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';

export const BLOCKS = {
  'read-aloud': { label: 'Read aloud', audience: 'players', tag: 'aside' },
  'player-facing': { label: 'Player-facing', audience: 'players', tag: 'aside' },
  secret: { label: 'Secret', audience: 'gm', tag: 'aside' },
  'gm-note': { label: 'GM note', audience: 'gm', tag: 'aside' },
  design: { label: 'Designer note', audience: 'designer', tag: 'aside' },
  branch: { label: 'Branch', audience: 'gm', tag: 'section' },
};
export const TEXT_DIRECTIVES = ['ref', 'stat', 'cite'];
export const LEAF_DIRECTIVES = ['clock', 'embed', 'part-contents'];
// Directive attribute shorthand splits "#npc.vara-cairn" into id "npc" plus class
// "vara-cairn" (a dot starts a class). Rebuild the canonical ID from both parts.
export function directiveId(node) {
  const a = node.attributes ?? {};
  if (!a.id) return undefined;
  return a.class ? [a.id, ...a.class.split(/\s+/).filter(Boolean)].join('.') : a.id;
}

export function parseMarkdownBody(body) {
  return fromMarkdown(body, {
    extensions: [directive(), gfm()],
    mdastExtensions: [directiveFromMarkdown(), gfmFromMarkdown()],
  });
}

