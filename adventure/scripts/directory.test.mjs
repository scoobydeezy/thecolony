import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry } from '../src/lib/registry.mjs';
import { directoryHast, directoryError } from '../src/lib/directory.mjs';

const reg = loadRegistry({ fresh: true });
function nodes(tree) { return [tree, ...(tree.children ?? []).flatMap(nodes)]; }
function textOf(tree) { return nodes(tree).filter(n => n.type === 'text').map(n => n.value).join(' '); }

test('each directory links every owning record exactly once', () => {
  for (const attrs of [{ type: 'location' }, { type: 'faction' }, { type: 'rule' }, { type: 'npc', group: 'faction' }, { type: 'npc', group: 'location' }]) {
    const tree = directoryHast(reg, attrs);
    const expected = reg.entities.filter(e => e.type === attrs.type).map(e => e.data.id).sort();
    const rows = nodes(tree).filter(n => n.tagName === 'tbody').flatMap(n => n.children);
    const actual = rows.map(row => row.children[0].children[0].properties['data-ref']).sort();
    assert.deepEqual(actual, expected);
    const ids = nodes(tree).map(n => n.properties?.id).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('NPC directory preserves Forgotten status and absent location without inventing availability', () => {
  const tree = directoryHast(reg, { type: 'npc', group: 'faction' });
  const row = nodes(tree).find(n => n.tagName === 'tr' && nodes(n).some(x => x.properties?.['data-ref'] === 'npc.marek-cairn'));
  assert.match(textOf(row), /Marek Cairn.*Not recorded.*Forgotten/);
  assert.match(textOf(tree), /At the start of the campaign/);
});

test('faction comparison separates seven factions from four social classes', () => {
  const tree = directoryHast(reg, { type: 'faction' });
  const sections = tree.children.filter(n => n.tagName === 'section');
  const counts = Object.fromEntries(sections.map(s => [textOf(s.children[0]), nodes(s).find(n => n.tagName === 'tbody').children.length]));
  assert.deepEqual(counts, { Factions: 7, 'Social classes': 4 });
});

test('owner changes are rendered directly and unsupported directory options are rejected', () => {
  const owner = reg.byId.get('npc.marek-cairn');
  const changed = { ...reg, byId: new Map(reg.byId) };
  changed.byId.set(owner.data.id, { ...owner, data: { ...owner.data, role: 'Changed in the owning record' } });
  assert.match(textOf(directoryHast(changed, { type: 'npc', group: 'location' })), /Changed in the owning record/);
  assert.ok(directoryError({ type: 'npc' }));
  assert.ok(directoryError({ type: 'location', group: 'faction' }));
  assert.throws(() => directoryHast(reg, { type: 'unknown' }));
});
