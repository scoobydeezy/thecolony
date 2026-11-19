import { loadRegistry } from '../../lib/registry.mjs';
import { playerHandout, hasPlayerBlocks } from '../../lib/player-handout.mjs';

export function getStaticPaths() {
  const reg = loadRegistry();
  return [...reg.byId.values()]
    // audience defaults to players (schemas.mjs); a handout with no player-facing block has nothing to export.
    .filter(entry => entry.type === 'handout' && (entry.data.audience ?? 'players') === 'players' && hasPlayerBlocks(entry.body))
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
