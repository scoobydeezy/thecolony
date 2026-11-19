import { parseMarkdownBody } from './markup.mjs';

// Export only explicitly player-facing top-level blocks. Never render the GM page, its metadata, links,
// reference drawer, or surrounding notes into a handout. Anything that could carry GM material or point
// into the GM book is refused rather than filtered, so a mistake fails the build instead of leaking:
// nested directives, raw HTML (comments, hidden spans, <details>), links, images and link definitions,
// and an unclosed block (which would otherwise run to the end of the file).
const REFUSED = {
  html: 'raw HTML',
  link: 'a link', linkReference: 'a link', definition: 'a link definition',
  image: 'an image', imageReference: 'an image',
};
const blocksOf = (tree) => tree.children.filter((n) => n.type === 'containerDirective' && n.name === 'player-facing');

// True when the handout has something to export (the download route and the handout page use this).
export function hasPlayerBlocks(body) {
  return !!body && blocksOf(parseMarkdownBody(body)).length > 0;
}

export function playerHandout(body, title) {
  const tree = parseMarkdownBody(body);
  const blocks = blocksOf(tree);
  if (!blocks.length) throw new Error('Player handout needs an explicit player-facing block');
  const line = (node) => node.position?.start.line ?? '?';
  const safe = (node) => {
    // A bare `word:word` in prose parses as an attribute-less text directive: it is plain text, kept as written.
    const prose = node.type === 'textDirective' && !Object.keys(node.attributes ?? {}).length && !(node.children ?? []).length;
    if (/Directive$/.test(node.type) && !prose) throw new Error(`Nested directives are not allowed in player exports (line ${line(node)})`);
    if (REFUSED[node.type]) throw new Error(`Line ${line(node)}: ${REFUSED[node.type]} is not allowed in player exports`);
    for (const child of node.children ?? []) safe(child);
  };
  for (const block of blocks) {
    if (!/(^|\n):{3,}\s*$/.test(body.slice(block.position.start.offset, block.position.end.offset)))
      throw new Error(`Line ${line(block)}: the :::player-facing block is not closed`);
  }
  const chunks = blocks.flatMap((block) => block.children
    .filter((node) => !node.data?.directiveLabel)   // :::player-facing[label]: the label is the GM's, not the players'
    .map((node) => { safe(node); return body.slice(node.position.start.offset, node.position.end.offset); }));
  return `# ${title}\n\n${chunks.join('\n\n')}\n`;
}
