import { loadRegistry } from '../../lib/registry.mjs';
import { playerHandout } from '../../lib/player-handout.mjs';

export function getStaticPaths() {
  const reg = loadRegistry();
  return [...reg.byId.values()]
    .filter(entry => entry.type === 'handout' && entry.data.audience === 'players')
    .map(entry => ({ params: { slug: entry.data.slug }, props: { entry } }));
}

export function GET({ props }) {
  const { entry } = props;
  return new Response(playerHandout(entry.body, entry.data.name), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entry.data.slug}.md"`,
    },
  });
}
