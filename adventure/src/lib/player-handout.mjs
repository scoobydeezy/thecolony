import { parseMarkdownBody } from './markup.mjs';

// Export only explicitly player-facing top-level blocks. Never render the GM page,
// its metadata, links, reference drawer, or surrounding notes into a handout.
export function playerHandout(body, title) {
  const tree = parseMarkdownBody(body);
  const blocks = tree.children.filter(n => n.type === 'containerDirective' && n.name === 'player-facing');
  if (!blocks.length) throw new Error('Player handout needs an explicit player-facing block');
  const safe = node => {
    if (/Directive$/.test(node.type)) throw new Error('Nested directives are not allowed in player exports');
    for (const child of node.children ?? []) safe(child);
  };
  const chunks = blocks.flatMap(block => block.children.map(node => {
    safe(node);
    return body.slice(node.position.start.offset, node.position.end.offset);
  }));
  return `# ${title}\n\n${chunks.join('\n\n')}\n`;
}
