const ANCESTRY_SLUG_MAP: Record<string, string> = {
  // Human-like
  'Human':           'human',
  'Samsaran':        'human',
  'Fetchling':       'human',

  // Humanoid height variants
  'Elf':             'tall-humanoid',
  'Gnome':           'short-humanoid',
  'Halfling':        'short-humanoid',
  'Dwarf':           'dwarf',

  // Goblinoid / Orcish
  'Goblin':          'goblinkind',
  'Hobgoblin':       'goblinkind',
  'Orc':             'orc',

  // Giant-kin
  'Jotunborn':       'giantkin',

  // Small fey
  'Sprite':          'small-fey',
  'Wayang':          'small-fey',

  // Beast-folk
  'Catfolk':         'catfolk',
  'Kitsune':         'canine-folk',
  'Tanuki':          'canine-folk',
  'Kholo':           'canine-folk',
  'Shoony':          'canine-folk',
  'Ratfolk':         'ratfolk',
  'Tengu':           'birdfolk',
  'Strix':           'tall-humanoid',
  'Vanara':          'monkeyfolk',
  'Tripkee':         'frog-folk',

  // Reptilian / Serpentine
  'Lizardfolk':      'serpentine',
  'Nagaji':          'serpentine',
  'Vishkanya':       'serpentine',
  'Kobold':          'kobold',
  'Dragonet':        'dragonborn',

  // Aquatic
  'Athamaru':        'aquatic-humanoid',
  'Azarketi':        'aquatic-humanoid',
  'Merfolk':         'aquatic-humanoid',

  // Large
  'Minotaur':        'bovine-large',
  'Sarangay':        'bovine-large',
  'Centaur':         'centaur',

  // Arachnid / Insectoid
  'Anadi':           'spider-folk',
  'Surki':           'insectoid',

  // Plant
  'Ghoran':          'plant-folk',
  'Leshy':           'plant-folk',

  // Constructed
  'Android':         'construct',
  'Automaton':       'construct',
  'Conrasu':         'construct',
  'Poppet':          'doll',

  // Undead
  'Skeleton':        'skeleton',

  // Spirit
  'Yaksha':          'spirit-folk',
  'Yaoguai':         'spirit-folk',

  // Aberrant
  'Fleshwarp':       'aberrant',
  'Goloma':          'aberrant',

  // Unusual (no close visual match)
  'Kashrishi':       'kashrishi',
  'Shisk':           'shisk',

  // Awakened Animal
  'Awakened Animal': 'awakened-animal',
};

const FALLBACK_SLUG = 'human';

const FEMALE_VARIANTS = new Set([
  'dwarf', 'goblinkind', 'human', 'orc', 'short-humanoid', 'tall-humanoid',
]);

export function getAncestryImagePath(ancestry: string | undefined, gender?: string): string {
  const slug = (ancestry && ANCESTRY_SLUG_MAP[ancestry]) ?? FALLBACK_SLUG;
  const isFemale = gender?.toLowerCase() === 'female';
  const suffix = isFemale && FEMALE_VARIANTS.has(slug) ? '-f' : '';
  return `/images/ancestries/${slug}${suffix}.png`;
}

export const FALLBACK_ANCESTRY_IMAGE = `/images/ancestries/${FALLBACK_SLUG}.png`;
