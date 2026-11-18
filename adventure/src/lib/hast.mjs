// Tiny hast builder so generated markup has no framework dependency and can be
// serialised identically for book pages, inline embeds and the reference export.
export function h(tagName, properties = {}, children = []) {
  const kids = (Array.isArray(children) ? children : [children])
    .flat()
    .filter((c) => c !== null && c !== undefined && c !== false)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? { type: 'text', value: String(c) } : c));
  return { type: 'element', tagName, properties, children: kids };
}
