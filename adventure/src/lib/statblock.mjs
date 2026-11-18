// Pass the registry *view* (viewOf), not raw frontmatter: for an NPC's stat block
// the name and ancestry trait come from the NPC entry.
// One renderer for a creature's typed statistics. The book page, inline
// ::embed and the Angular drawer export all call this, so the numbers can
// never be presented two different ways.
import { h } from './hast.mjs';
import { signed } from './pf2e.mjs';

const line = (label, value) => (value === undefined || value === null || value === '' ? null : h('p', {}, [h('strong', {}, label), ' ', value]));
const list = (arr) => (arr && arr.length ? arr.join(', ') : null);
const record = (obj) => (obj && Object.keys(obj).length ? Object.entries(obj).map(([k, v]) => `${k} ${signed(v)}`).join(', ') : null);

export function statblockHast(d) {
  const traits = [d.rarity && d.rarity !== 'common' ? d.rarity : null, d.size, ...(d.traits ?? [])].filter(Boolean);
  const strikes = (d.strikes ?? []).map((s) =>
    h('p', { className: ['rp-sb-strike'] }, [
      h('strong', {}, s.type === 'ranged' ? 'Ranged' : 'Melee'),
      ' ',
      h('span', { className: ['rp-action'], 'aria-label': 'single action' }, '◆'),
      ` ${s.name} ${signed(s.bonus)}${s.traits?.length ? ` (${s.traits.join(', ')})` : ''}, `,
      h('strong', {}, 'Damage'),
      ` ${s.damage}`,
    ]),
  );
  return h('section', { className: ['rp-statblock'], 'data-entity': d.id }, [
    h('header', { className: ['rp-sb-head'] }, [
      h('span', { className: ['rp-sb-name'] }, d.variant ? [d.name, h('span', { className: ['rp-sb-variant'] }, ` · ${d.variant}`)] : d.name),
      h('span', { className: ['rp-sb-level'] }, (d.levelLabel ?? `Creature ${d.level}`).toUpperCase()),
    ]),
    traits.length ? h('ul', { className: ['rp-sb-traits'] }, traits.map((t) => h('li', {}, t))) : null,
    line('Perception', [signed(d.perception), d.senses?.length ? `; ${d.senses.join(', ')}` : ''].join('')),
    line('Languages', list(d.languages)),
    line('Skills', record(d.skills)),
    h('hr'),
    line('AC', [String(d.ac), '; ', h('strong', {}, 'Fort'), ` ${signed(d.saves.fort)}, `, h('strong', {}, 'Ref'), ` ${signed(d.saves.ref)}, `, h('strong', {}, 'Will'), ` ${signed(d.saves.will)}`]),
    line('HP', [String(d.hp), d.immunities?.length ? '; ' : '', d.immunities?.length ? h('strong', {}, 'Immunities') : null, d.immunities?.length ? ` ${d.immunities.join(', ')}` : '']),
    line('Resistances', list(d.resistances)),
    line('Weaknesses', list(d.weaknesses)),
    h('hr'),
    line('Speed', d.speed),
    ...strikes,
    line('Ability DC', d.abilityDC),
  ]);
}
