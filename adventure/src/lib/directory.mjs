import { entityUrl } from './registry.mjs';
import { h } from './hast.mjs';

export function directoryError({ type, group } = {}) {
  if (!['npc', 'location', 'faction', 'rule'].includes(type)) return '::directory requires type=npc, location, faction or rule';
  if (type === 'npc' && !['faction', 'location'].includes(group)) return 'NPC directories require group=faction or location';
  if (type !== 'npc' && group) return 'Only NPC directories accept group';
}

// Read baseline facts from their owners; never treat this directory as live state.
export function directoryHast(reg, attrs) {
  const error = directoryError(attrs);
  if (error) throw new Error(error);
  const { type, group } = attrs;
  const entries = [...reg.byId.values()].filter(e => e.type === type).sort((a, b) => a.view.name.localeCompare(b.view.name));
  const link = id => {
    const e = reg.byId.get(id);
    return e ? h('a', { href: entityUrl(e), 'data-ref': id }, e.view.name) : 'Not recorded';
  };
  const table = (headers, rows) => h('table', {}, [
    h('thead', {}, h('tr', {}, headers.map(x => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows.map(row => h('tr', {}, row.map(x => h('td', {}, x))))),
  ]);
  if (type === 'rule') return h('div', { className: ['rp-directory'], 'data-directory': 'rule' },
    table(['Rule or term', 'Meaning and use'], entries.map(e => [link(e.data.id), e.data.summary ?? 'Open the entry for its definition and procedure.'])));
  const groups = new Map();
  for (const e of entries) {
    const key = type === 'npc' ? e.data.start?.[group] ?? '' : type === 'location' ? e.data.parent ?? '' : e.data.type;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  const label = key => reg.byId.get(key)?.view.name ?? (type === 'faction' ? key === 'SocialClass' ? 'Social classes' : 'Factions' : type === 'location' ? 'Regional and distributed locations' : `No starting ${group} recorded`);
  return h('div', { className: ['rp-directory'], 'data-directory': `${type}-${group ?? 'default'}` }, [
    h('p', {}, 'At the start of the campaign. These records describe the baseline; consult the campaign app for changes made in play.'),
    ...[...groups].sort(([a], [b]) => label(a).localeCompare(label(b))).map(([key, list]) => h('section', {}, [
      h('h3', { id: `directory-${type}-${group ?? 'default'}-${key.replaceAll('.', '-') || 'unassigned'}` }, label(key)),
      type === 'npc'
        ? table(['Person', 'Role', group === 'faction' ? 'Starting location' : 'Starting faction', 'Starting state'], list.map(e => [link(e.data.id), e.data.role ?? '—', link(e.data.start?.[group === 'faction' ? 'location' : 'faction']), e.data.start?.state ?? 'Not recorded']))
        : type === 'location'
          ? table(['Place', 'Character'], list.map(e => [link(e.data.id), e.data.summary ?? 'See location entry.']))
          : table(['Community', 'What it recognizes', 'What it misses'], list.map(e => [link(e.data.id), e.data.rightAbout ?? '—', e.data.wrongAbout ?? '—'])),
    ])),
  ]);
}
