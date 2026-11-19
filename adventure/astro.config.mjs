// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import remarkColony from './src/lib/remark-colony.mjs';
import { BOOK_TARGET, isDesigner, BASE } from './src/lib/target.mjs';
import { loadRegistry, loadParts, partChapters, unplacedItems, entityUrl, ENTITY_TYPES } from './src/lib/registry.mjs';

// Reference (BOOK-STRUCTURE.md §1, Part VI): generated from the entries, in the approved order. Each index
// is a collapsed group (its index page, then its entries in the index page's order) so the page you are on
// is selectable under its parent; Starlight opens the group that holds the current page. An index with no
// entries stays a plain link.
const REFERENCE = [
  ['Bestiary', 'creature'], ['Veiled Sources', 'source'], ['Hazards', 'hazard'], ['Items and Treasure', 'item'],
  ['NPCs', 'npc'], ['Factions', 'faction'], ['Faction Goals', 'goal'], ['Assets', 'asset'], ['Locations', 'location'],
  ['World Conditions', 'condition'], ['Narrative Threads', 'thread'], ['Branches', 'branch'], ['Rules Reference', 'rule'],
  ['Maps', 'map'], ['Handouts and Props', 'handout'],
];
const stripBase = (url) => url.replace(new RegExp(`^${BASE}`), '');
const reg = loadRegistry({ fresh: true });
// An entry a part lists in one of its chapters (a Veiled rule, the Clearing House) is in the sidebar there, not
// again here, so each page has one place in the sidebar. Its index still lists it.
const placed = new Set(loadParts().flatMap((c) => partChapters(reg, c).flatMap((s) => s.items.map((e) => e.data.id))));
const appendices = [
  ...REFERENCE.map(([label, type]) => {
    const link = `/${ENTITY_TYPES[type].area}/`;
    const entries = reg.entities
      .filter((e) => e.type === type && entityUrl(e) && !placed.has(e.data.id))
      // A stat block variant reads as the index page shows it: "High Keeper Serevan Ilvar (The Reading)".
      .map((e) => ({ label: `${e.view.fullName ?? e.view.name}${e.view.variant ? ` (${e.view.variant})` : ''}`, link: stripBase(entityUrl(e)) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return entries.length ? { label, collapsed: true, items: [{ label: 'Index', link }, ...entries] } : { label, link };
  }),
  // Book pages: Starlight takes the label from the page (sidebar.label, else its title).
  'reference/glossary',
  'reference/quick-reference',
];

// The book's parts (BOOK-STRUCTURE.md §1): one sidebar group per part page (docs/<dir>/index.md with
// part: frontmatter), in sidebar order. An act lists its chapters as sub-groups, each with its events and
// encounters; a general part (Running, The Colony) lists its folder's pages. Read when the config loads,
// so a new event file appears after a rebuild. (A page's ## headings are its sections, in Starlight's sense.)
// How a chapter's items relate, shown in its sidebar label (BOOK-STRUCTURE.md §2).
const ARRANGEMENT_HINT = { alternatives: ' (alternatives)', optional: ' (any order)', concurrent: ' (at the same time)', reference: ' (throughout the act)' };
const parts = loadParts().map((c) => ({
  label: c.label,   // part.label, else the page title (user, 2026-11-18: no "Part I" prefixes)
  items: c.chapters.length === 0
    ? [{ autogenerate: { directory: c.dir } }]
    : [
        { label: c.pageLabel, link: `/${c.dir}/` },   // sidebar.label, else the page title (also its name in Previous / Next)
        ...c.pages.map((p) => ({ label: p.label, link: `/${c.dir}/${p.slug}/` })),   // the part's own pages, in sidebar.order
        ...partChapters(reg, c).map((s) => ({
          label: s.label ?? `${s.title}${ARRANGEMENT_HINT[s.arrangement] ?? ''}`,   // chapter label, else title + hint
          items: s.items.map((e) => {
            const link = stripBase(entityUrl(e) ?? '');
            // An item with pages of its own (The Burden's phases) becomes a group: its page, then its parts.
            const label = e.data.sidebar?.label ?? e.view.name;
            return e.pages?.length
              ? { label, items: [{ label: e.data.sidebar?.overviewLabel ?? 'Overview', link }, ...e.pages.map((p) => ({ label: p.label, link: `/${c.dir}/${p.slug}/` }))] }
              : { label, link };
          }),
        })),
      ],
}));


const designer = [
  {
    label: 'Designer',
    items: [
      { label: 'Migration status', link: '/designer/migration/' },
      { label: 'Source documents', link: '/designer/source-docs/' },
      { label: 'Coverage inventory', link: '/designer/coverage/' },
      { label: 'Readiness', link: '/designer/readiness/' },
      { label: 'Open decisions', link: '/designer/decisions/' },
      { label: 'Fabrication', link: '/designer/fabrication/' },
      { label: 'Playtest log', link: '/designer/playtest/' },
      // Maintenance views (moved here from the GM appendices, BOOK-STRUCTURE.md §1.7).
      { label: 'Stale references', link: '/stale-references/' },
      ...(unplacedItems(reg).length ? [{ label: 'Unplaced events and encounters', link: '/unplaced/' }] : []),
    ],
  },
];

export default defineConfig({
  base: BASE,
  outDir: isDesigner ? './dist-designer' : './dist',
  // Writing mode (`astro dev`) ports. 4321 is reserved for `npm run serve`,
  // the built book that the Angular dev server proxies at /docs.
  server: { port: isDesigner ? 4323 : 4322 },
  markdown: {
    processor: unified({ remarkPlugins: [[remarkColony, { target: BOOK_TARGET }]] }),
  },
  integrations: [
    starlight({
      title: isDesigner ? 'Results Pending (Designer)' : 'Results Pending',
      description: 'The Colony — a Pathfinder Second Edition campaign. GM reference.',
      customCss: ['./src/styles/colony.css'],
      components: {
        SocialIcons: './src/components/overrides/SocialIcons.astro',
        PageTitle: './src/components/overrides/PageTitle.astro',   // + the editor's toolbar (§16)
        PageSidebar: './src/components/overrides/PageSidebar.astro',   // + an item's narrative threads
      },
      sidebar: [
        ...parts,
        { label: 'Reference', items: appendices },
        ...(isDesigner ? designer : []),
      ],
      pagination: true,
      lastUpdated: false,
    }),
  ],
});
