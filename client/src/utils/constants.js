import {
  BarChart3,
  Gauge,
  Heart,
  Images,
  LayoutDashboard,
  ListOrdered,
  Settings2,
  Swords,
  Users,
} from 'lucide-react';

export const NAV_SECTIONS = [
  {
    label: 'Explore',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/characters', label: 'Character Database', icon: Users },
      { to: '/battle', label: 'VS Battle', icon: Swords },
      { to: '/power-scaling', label: 'Power Scaling', icon: Gauge },
    ],
  },
  {
    label: 'Create',
    items: [
      { to: '/tier-list', label: 'Tier List', icon: ListOrdered },
      { to: '/gallery', label: 'Anime Gallery', icon: Images },
    ],
  },
  {
    label: 'Personal',
    items: [
      { to: '/favorites', label: 'Favorites', icon: Heart },
      { to: '/settings', label: 'Settings', icon: Settings2 },
    ],
  },
];

export const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/characters', label: 'Characters', icon: Users },
  { to: '/battle', label: 'Battle', icon: Swords },
  { to: '/tier-list', label: 'Tiers', icon: ListOrdered },
];

export const POWER_ICON = BarChart3;

export const STATUSES = ['Alive', 'Deceased', 'Unknown', 'Sealed', 'Inactive'];
export const DATA_SOURCES = ['community', 'demo', 'official'];

export const DATA_SOURCE_META = {
  official: {
    label: 'Official',
    tone: 'official',
    description: 'Presented as an official figure. Always confirm against the primary source.',
  },
  community: {
    label: 'Community interpretation',
    tone: 'community',
    description:
      'Derived from community power-scaling discussion. Useful for comparison, not an official statement.',
  },
  demo: {
    label: 'Demo data',
    tone: 'demo',
    description: 'Illustrative values created to exercise the app. Not a factual claim.',
  },
};

export const SCALED_STATS = [
  { key: 'ap', label: 'Attack Potency', short: 'AP', weight: 20 },
  { key: 'speed', label: 'Speed', short: 'SPD', weight: 15 },
  { key: 'durability', label: 'Durability', short: 'DUR', weight: 15 },
  { key: 'strength', label: 'Strength', short: 'STR', weight: 10 },
  { key: 'intelligence', label: 'Intelligence', short: 'INT', weight: 10 },
  { key: 'stamina', label: 'Stamina', short: 'STA', weight: 10 },
  { key: 'range', label: 'Range', short: 'RNG', weight: 5 },
  { key: 'combatSkill', label: 'Combat Skill', short: 'CBT', weight: 15 },
];

export const HAX_STAT = { key: 'hax', label: 'Hax index', short: 'HAX', weight: 0 };

export const ALL_STATS = [
  SCALED_STATS[0],
  SCALED_STATS[1],
  SCALED_STATS[2],
  SCALED_STATS[3],
  SCALED_STATS[4],
  SCALED_STATS[5],
  HAX_STAT,
  SCALED_STATS[6],
  SCALED_STATS[7],
];

export const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'tier_asc', label: 'Highest tier' },
  { value: 'tier_desc', label: 'Lowest tier' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export const FAVORITE_SORT_OPTIONS = [
  { value: 'recent', label: 'Recently added' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
];

export const GALLERY_CATEGORIES = ['Cinematic', 'Action', 'Landscape', 'Character'];

export const DEFAULT_TIER_TEMPLATE = [
  { id: 's', name: 'S', color: '#ff8a5c' },
  { id: 'a', name: 'A', color: '#ffd166' },
  { id: 'b', name: 'B', color: '#4cd7b0' },
  { id: 'c', name: 'C', color: '#4fb7ff' },
  { id: 'd', name: 'D', color: '#8f9bb3' },
  { id: 'f', name: 'F', color: '#ff6b8a' },
  { id: 'unranked', name: 'Unranked', color: '#5c6a82' },
];

export const TIER_TONE = {
  0: '#f6dc93',
  1: '#f4a1ff',
  2: '#b799ff',
  3: '#86a9ff',
  4: '#55d8ff',
  5: '#45e5c6',
  6: '#66e6a1',
  7: '#a7e36a',
  8: '#ebd873',
  9: '#f2ad6f',
  10: '#a3b2c8',
};

export function tierBand(key) {
  if (!key) return 10;
  if (key === '0' || key === 'Tier 0') return 0;
  const band = Number(String(key).split('-')[0]);
  return Number.isFinite(band) ? band : 10;
}

export function tierColor(key) {
  return TIER_TONE[tierBand(key)] || TIER_TONE[10];
}

export function tierFamily(key) {
  const band = tierBand(key);
  if (band === 0) return 'Boundless';
  if (band === 1) return 'Outerverse';
  if (band === 2) return 'Multiverse';
  if (band === 3) return 'Galactic / universal';
  if (band === 4) return 'Stellar';
  if (band === 5) return 'Planetary';
  if (band === 6) return 'Continental';
  if (band === 7) return 'City / mountain';
  if (band === 8) return 'Building / block';
  if (band === 9) return 'Street / wall';
  return 'Human';
}

export const PAGE_SIZE = 8;

export const BATTLE_RESULT_META = {
  a: { label: 'First character leads', tone: 'a' },
  b: { label: 'Second character leads', tone: 'b' },
  draw: { label: 'Too close to call', tone: 'draw' },
  insufficient: { label: 'Insufficient data', tone: 'insufficient' },
};
