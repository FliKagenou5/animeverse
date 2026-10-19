import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { analyzePair } from '../services/battleAnalysis.js';
import { CHARACTER_SELECT, mapCharacter } from '../utils/mappers.js';
import { withTransaction } from './index.js';

export const TIER_DEFINITIONS = [
  { key: '0', label: 'Tier 0', description: 'Beyond every dimensional and conceptual scale used by this system. A label for the edge of the framework, not a battle result.', example: 'Boundless / beyond hierarchy' },
  { key: '1-A', label: '1-A', description: 'Outerverse level: operates beyond conventional space, time and dimensionality.', example: 'Concepts and layers beyond standard reality' },
  { key: '1-B', label: '1-B', description: 'Hyperverse level: structures containing multiple infinite multiverses.', example: 'A hierarchy of multiverses' },
  { key: '1-C', label: '1-C', description: 'Complex multiverse level: layered multiverses with higher-dimensional geometry.', example: 'Dimensional stacks and nested continua' },
  { key: '2-A', label: '2-A', description: 'Multiverse+ level: spans an effectively endless set of universes.', example: 'Endless branching timelines' },
  { key: '2-B', label: '2-B', description: 'Multiverse level: influences or destroys multiple universes.', example: 'Multiple complete space-time continua' },
  { key: '2-C', label: '2-C', description: 'Low multiverse level: threatens a small set of universes or a whole space-time continuum.', example: 'A few universes or one timeline network' },
  { key: '3-A', label: '3-A', description: 'Universe level: universe-scale destruction or creation.', example: 'An entire observable universe' },
  { key: '3-B', label: '3-B', description: 'Multi-galaxy level: spans many galaxies.', example: 'Galaxy clusters and superstructures' },
  { key: '3-C', label: '3-C', description: 'Galaxy level: galaxy-scale phenomena.', example: 'The Milky Way and comparable galaxies' },
  { key: '4-A', label: '4-A', description: 'Multi-solar-system level: consumes multiple star systems.', example: 'Star clusters and nearby systems' },
  { key: '4-B', label: '4-B', description: 'Solar-system level: star-system-scale energy.', example: 'A star plus its orbiting bodies' },
  { key: '4-C', label: '4-C', description: 'Star level: stellar destruction or creation.', example: 'A main-sequence star' },
  { key: '5-A', label: '5-A', description: 'Large-planet level: overwhelms giant planets or multiple planets.', example: 'Gas giants and planet clusters' },
  { key: '5-B', label: '5-B', description: 'Planet level: planet-scale destruction.', example: 'An Earth-like planet' },
  { key: '5-C', label: '5-C', description: 'Moon level: moon-scale destruction.', example: 'A natural satellite' },
  { key: '6-A', label: '6-A', description: 'Continent level: continent-scale effects.', example: 'Continents and tectonic plates' },
  { key: '6-B', label: '6-B', description: 'Country level: country-scale destruction.', example: 'A large nation' },
  { key: '6-C', label: '6-C', description: 'Island level: island-scale destruction.', example: 'Large islands and archipelagos' },
  { key: '7-A', label: '7-A', description: 'Mountain level: mountain-level impacts.', example: 'Mountains and large ranges' },
  { key: '7-B', label: '7-B', description: 'City level: city-scale destruction.', example: 'A dense metropolis' },
  { key: '7-C', label: '7-C', description: 'Town level: town-scale destruction.', example: 'A town and surrounding district' },
  { key: '8-A', label: '8-A', description: 'Multi-city-block level: several city blocks at once.', example: 'A downtown district' },
  { key: '8-B', label: '8-B', description: 'City-block level: one block; large buildings collapse.', example: 'Reinforced urban infrastructure' },
  { key: '8-C', label: '8-C', description: 'Building level: multi-storey building destruction.', example: 'A large office or apartment block' },
  { key: '9-A', label: '9-A', description: 'Small-building level: small structures, vehicles and reinforced rooms.', example: 'A house or armoured car' },
  { key: '9-B', label: '9-B', description: 'Wall level: breaches reinforced walls.', example: 'Brick and concrete walls' },
  { key: '9-C', label: '9-C', description: 'Street level: superhuman impacts; concrete cracks and metal dents.', example: 'Street brawls between superhumans' },
  { key: '10-A', label: '10-A', description: 'Athlete level: peak-human strength and speed, no superhuman output.', example: 'Olympic athletes and elite fighters' },
  { key: '10-B', label: '10-B', description: 'Human level: typical adult human limits.', example: 'Everyday people' },
  { key: '10-C', label: '10-C', description: 'Below-human level: below-average physical output.', example: 'Children or untrained civilians' },
];

const ANIME_SEED = [
  {
    title: 'Bleach',
    slug: 'bleach',
    year: 2004,
    studio: 'Studio Pierrot',
    synopsis:
      'A teenager gains the powers of a soul reaper and is pulled into a hidden war between spirits, hollows and the societies that police the afterlife.',
  },
  {
    title: 'Naruto',
    slug: 'naruto',
    year: 2002,
    studio: 'Studio Pierrot',
    synopsis:
      "A young ninja with a sealed fox spirit seeks recognition and friendship while growing through the Hidden Leaf's trials toward the title of Hokage.",
  },
  {
    title: 'One Piece',
    slug: 'one-piece',
    year: 1999,
    studio: 'Toei Animation',
    synopsis:
      'A rubber-bodied pirate captain sails toward the legendary One Piece, gathering a found family and challenging the powers that rule the seas.',
  },
  {
    title: 'Dragon Ball',
    slug: 'dragon-ball',
    year: 1986,
    studio: 'Toei Animation',
    synopsis:
      'A martial artist with Saiyan heritage pursues ever-stronger opponents, protecting Earth while uncovering the scale of the wider cosmos.',
  },
  {
    title: 'Jujutsu Kaisen',
    slug: 'jujutsu-kaisen',
    year: 2020,
    studio: 'MAPPA',
    synopsis:
      'A student swallows a cursed relic and enters a hidden world of sorcery, where curses feed on human fear and sorcerers pay a price for power.',
  },
  {
    title: 'The Misfit of Demon King Academy',
    slug: 'misfit-demon-king-academy',
    year: 2020,
    studio: 'Silver Link',
    synopsis:
      'A reincarnated demon king enrolls in the academy built around his own legend, testing a complacent magical world that has forgotten real strength.',
  },
  {
    title: 'Demon Slayer: Kimetsu no Yaiba',
    slug: 'demon-slayer',
    year: 2019,
    studio: 'ufotable',
    synopsis:
      'A kind-hearted demon slayer hunts the creatures that destroyed his family while searching for a cure for his sister.',
  },
  {
    title: 'Frieren: Beyond Journey’s End',
    slug: 'frieren',
    year: 2023,
    studio: 'Madhouse',
    synopsis:
      'An elf mage retraces the journey of her old party, learning how short-lived companions change the meaning of time and memory.',
  },
];

const CHARACTERS = [
  {
    name: 'Ichigo Kurosaki',
    alias: 'Substitute Soul Reaper',
    anime: 'Bleach',
    tier: '3-A',
    description:
      'A soul reaper who inherited his powers in a sudden encounter and now guards the living world from hollows. His resolve is built around protecting the people close to him.',
    stats: { ap: 88, speed: 85, durability: 82, strength: 80, intelligence: 68, stamina: 78, hax: 70, range: 70, combatSkill: 88 },
    haxNote:
      "Soul-level spiritual attacks and spirit pressure can bypass ordinary physical defenses; effectiveness depends on the target's spiritual tolerance.",
    abilities: ['Bankai: Tensa Zangetsu', 'Getsuga Tensho', 'Hollow mask augmentation', 'High-speed flash steps'],
    weaknesses: 'His power depends on inner balance; prolonged fighting can expose gaps in control.',
    firstAppearance: 'Bleach manga, Chapter 1',
    status: 'Alive',
  },
  {
    name: 'Naruto Uzumaki',
    alias: 'Seventh Hokage',
    anime: 'Naruto',
    tier: '3-A',
    description:
      'A shinobi from the Hidden Leaf who turns persistence into strength. He carries the Nine-Tails within him and works to earn the trust of the people around him.',
    stats: { ap: 90, speed: 86, durability: 84, strength: 76, intelligence: 65, stamina: 92, hax: 72, range: 75, combatSkill: 82 },
    haxNote:
      'Sealing, chakra-based regeneration and overwhelming clone volume create unusual angles; most remain tied to chakra limits.',
    abilities: ['Sage Mode', 'Nine-Tails chakra control', 'Shadow clones', 'Rasenshuriken'],
    weaknesses: 'Large techniques cost enormous stamina, and emotional pressure can destabilize his control.',
    firstAppearance: 'Naruto manga, Chapter 1',
    status: 'Alive',
  },
  {
    name: 'Monkey D. Luffy',
    alias: 'Straw Hat',
    anime: 'One Piece',
    tier: '4-B',
    description:
      'A pirate captain with a rubber body and a stubborn dream of freedom. He gathers a crew that becomes the center of his choices.',
    stats: { ap: 82, speed: 85, durability: 84, strength: 82, intelligence: 58, stamina: 90, hax: 60, range: 45, combatSkill: 84 },
    haxNote:
      'Awakened rubber reality-bending is hard to map numerically; its limits are still being established in community discussions.',
    abilities: ["Gear Fifth", "Conqueror's Haki", 'Armament Haki', 'Awakened rubber body'],
    weaknesses: 'Haki drains quickly under sustained use, and reckless choices often put him in avoidable danger.',
    firstAppearance: 'One Piece manga, Chapter 1',
    status: 'Alive',
  },
  {
    name: 'Son Goku',
    alias: 'Kakarot',
    anime: 'Dragon Ball',
    tier: '2-C',
    description:
      'A Saiyan raised on Earth who pursues stronger opponents with relentless curiosity. His fighting instinct is matched by a talent for pushing through limits.',
    stats: { ap: 96, speed: 94, durability: 92, strength: 93, intelligence: 60, stamina: 90, hax: 78, range: 78, combatSkill: 95 },
    haxNote:
      'His technique breadth includes teleportation and ki sensing; these are tactical advantages, not an automatic win.',
    abilities: ['Ultra Instinct (community interpretation)', 'Instant Transmission', 'Kamehameha', 'Spirit Bomb'],
    weaknesses: 'He often lets opponents reach full power, and prolonged transformations demand heavy stamina.',
    firstAppearance: 'Dragon Ball manga, Chapter 1',
    status: 'Alive',
  },
  {
    name: 'Satoru Gojo',
    alias: 'The Strongest',
    anime: 'Jujutsu Kaisen',
    tier: '3-B',
    description:
      'A jujutsu sorcerer whose inherited technique turns space itself into a defense. He teaches the next generation while challenging the traditions of his world.',
    stats: { ap: 75, speed: 82, durability: 70, strength: 55, intelligence: 88, stamina: 72, hax: 98, range: 60, combatSkill: 86 },
    haxNote:
      'Limitless and Unlimited Void are extraordinarily hard to counter without specialized abilities. The model deliberately does not score this.',
    abilities: ['Limitless', 'Six Eyes', 'Domain Expansion: Unlimited Void', 'Reverse Cursed Technique'],
    weaknesses: 'His defenses are complex; specialized counter-techniques and domain clashes can create openings.',
    firstAppearance: 'Jujutsu Kaisen manga, Chapter 0',
    status: 'Unknown',
  },
  {
    name: 'Anos Voldigoad',
    alias: 'Demon King of Tyranny',
    anime: 'The Misfit of Demon King Academy',
    tier: '2-B',
    description:
      'A reincarnated demon king who returns centuries later to an era that has softened his legend. He tests the world with enormous magic and an unshakable confidence.',
    stats: { ap: 94, speed: 88, durability: 96, strength: 80, intelligence: 92, stamina: 95, hax: 99, range: 82, combatSkill: 84 },
    haxNote:
      'Community interpretation attributes broad magic, regeneration and fate/time effects. Treat these claims as contested analysis, not official facts.',
    abilities: ['Venuzdonoa', 'Origin magic', 'Regeneration', 'Time and fate effects (community interpretation)'],
    weaknesses: 'He frequently holds back, and his confidence can leave allies exposed to threats he considers trivial.',
    firstAppearance: 'The Misfit of Demon King Academy light novel, Volume 1',
    status: 'Alive',
  },
  {
    name: 'Roronoa Zoro',
    alias: 'Pirate Hunter',
    anime: 'One Piece',
    tier: '4-C',
    description:
      'A swordsman who follows a simple promise and an impossible goal. Three-sword style and punishing discipline define his path.',
    stats: { ap: 78, speed: 80, durability: 80, strength: 84, intelligence: 55, stamina: 85, hax: 40, range: 40, combatSkill: 92 },
    haxNote:
      'Advanced haki can cut through defenses that resist ordinary steel; range remains a genuine limitation.',
    abilities: ['Three-Sword Style', 'Busoshoku Haki', 'Kenbunshoku Haki', "Advanced Conqueror's Haki"],
    weaknesses: 'Extreme training injuries accumulate, and his sense of direction is unreliable outside combat.',
    firstAppearance: 'One Piece manga, Chapter 3',
    status: 'Alive',
  },
  {
    name: 'Sasuke Uchiha',
    alias: 'Last Uchiha',
    anime: 'Naruto',
    tier: '3-B',
    description:
      'A shinobi driven by clan history and revenge, later finding a narrower path toward protecting what remains. His eyes are the center of his fighting style.',
    stats: { ap: 82, speed: 88, durability: 74, strength: 62, intelligence: 84, stamina: 70, hax: 88, range: 70, combatSkill: 90 },
    haxNote:
      'Genjutsu and space-time techniques create win conditions outside raw statistics; counters vary heavily by matchup.',
    abilities: ['Rinnegan techniques', 'Amaterasu', 'Susanoo', 'Chidori'],
    weaknesses: 'High-level eye techniques strain him, and his resolve is vulnerable to isolation and manipulation.',
    firstAppearance: 'Naruto manga, Chapter 3',
    status: 'Alive',
  },
  {
    name: 'Vegeta',
    alias: 'Prince of All Saiyans',
    anime: 'Dragon Ball',
    tier: '2-C',
    description:
      "A proud Saiyan prince whose rivalry with Goku shapes his growth. His drive for superiority is paired with a willingness to fight alongside Earth's defenders.",
    stats: { ap: 93, speed: 90, durability: 89, strength: 90, intelligence: 62, stamina: 86, hax: 62, range: 70, combatSkill: 92 },
    haxNote:
      'Technique variety and ki control are strong, but his special techniques do not bypass durability in a conceptual way.',
    abilities: ['Ultra Ego (community interpretation)', 'Final Flash', 'Galick Gun', 'Super Saiyan Blue'],
    weaknesses: 'Pride can pull him into unnecessary damage, and transformations have steep stamina costs.',
    firstAppearance: 'Dragon Ball manga, Chapter 204',
    status: 'Alive',
  },
  {
    name: 'Yuji Itadori',
    alias: 'The Vessel',
    anime: 'Jujutsu Kaisen',
    tier: '7-A',
    description:
      'A student who becomes tied to a powerful curse and joins a hidden world of sorcery. His physical talent is matched by an uncompromising sense of responsibility.',
    stats: { ap: 62, speed: 72, durability: 66, strength: 70, intelligence: 58, stamina: 80, hax: 50, range: 30, combatSkill: 78 },
    haxNote:
      'Soul-targeting strikes make some matchups unusual; his current toolkit is still developing.',
    abilities: ['Divergent Fist', 'Black Flash', 'Reverse Cursed Technique (later arc)', "Sukuna's influence"],
    weaknesses: 'Limited experience with advanced sorcery and unstable access to his strongest reserves.',
    firstAppearance: 'Jujutsu Kaisen manga, Chapter 1',
    status: 'Alive',
  },
  {
    name: 'Tanjiro Kamado',
    alias: 'Demon Slayer',
    anime: 'Demon Slayer: Kimetsu no Yaiba',
    tier: '7-B',
    description:
      'A kind demon slayer searching for a way to restore his sister. He reads opponents through scent and water-breathing forms.',
    stats: { ap: 58, speed: 74, durability: 62, strength: 62, intelligence: 60, stamina: 82, hax: 45, range: 25, combatSkill: 82 },
    haxNote:
      'Breathing forms are precision tools, not conceptual hax. Sun Breathing adds burst damage with a heavy physical cost.',
    abilities: ['Water Breathing', 'Hinokami Kagura', 'Demon Slayer Mark', 'Sun Breathing (later arc)'],
    weaknesses: 'Human durability and the physical toll of marked techniques limit long battles.',
    firstAppearance: 'Demon Slayer: Kimetsu no Yaiba manga, Chapter 1',
    status: 'Alive',
  },
  {
    name: 'Frieren',
    alias: 'The Slayer',
    anime: 'Frieren: Beyond Journey’s End',
    tier: '6-A',
    description:
      'An elf mage who outlives her companions and slowly learns what their time together meant. Her magic is precise, patient and deeply studied.',
    stats: { ap: 70, speed: 60, durability: 50, strength: 30, intelligence: 95, stamina: 65, hax: 92, range: 85, combatSkill: 70 },
    haxNote:
      'Mana concealment and long-range binding magic reward preparation. The numeric hax index is only a rough label.',
    abilities: ['Zoltraak', 'Mana concealment', 'Flight', 'Long-range binding magic'],
    weaknesses: 'Her physical resilience is limited, and her instincts are tuned to a much slower pace of life.',
    firstAppearance: 'Frieren: Beyond Journey’s End manga, Chapter 1',
    status: 'Alive',
  },
];

const GALLERY_ATTRIBUTION =
  'Original AI-generated concept art created for the ANIMEVERSE demo. Unofficial and not affiliated with the series or its rights holders.';

const GALLERY = [
  {
    title: 'Gate of Falling Stars',
    anime: 'Bleach',
    category: 'Cinematic',
    file: '/gallery/gate-of-falling-stars.jpg',
    description:
      'A moonlit gate dissolves into drifting motes of light above a dark, rain-slick city. Original concept art, not a frame from the series.',
  },
  {
    title: 'Ember of the Hidden Leaf',
    anime: 'Naruto',
    category: 'Action',
    file: '/gallery/ember-of-the-hidden-leaf.jpg',
    description:
      'A lone shinobi silhouette races across rooftops as ember-like chakra trails behind. Original concept art.',
  },
  {
    title: 'Horizon of the Grand Line',
    anime: 'One Piece',
    category: 'Landscape',
    file: '/gallery/horizon-of-the-grand-line.jpg',
    description:
      'An impossible ocean stretches beneath stacked cloudbanks while a tiny ship traces a wake toward the horizon.',
  },
  {
    title: 'Saiyan Dawn',
    anime: 'Dragon Ball',
    category: 'Action',
    file: '/gallery/saiyan-dawn.jpg',
    description:
      "A warrior's silhouette braces against a sunrise of raw golden energy on a shattered plateau.",
  },
  {
    title: 'Veil of Cursed Light',
    anime: 'Jujutsu Kaisen',
    category: 'Cinematic',
    file: '/gallery/veil-of-cursed-light.jpg',
    description:
      'A veiled urban shrine glows under ribbons of violet light while rain hangs suspended in the air.',
  },
  {
    title: 'Throne of the Demon King',
    anime: 'The Misfit of Demon King Academy',
    category: 'Character',
    file: '/gallery/throne-of-the-demon-king.jpg',
    description:
      'An original masked figure sits beneath a single crimson sigil in a hall of shadow and fractured stone.',
  },
  {
    title: 'Petal Storm',
    anime: 'Demon Slayer: Kimetsu no Yaiba',
    category: 'Action',
    file: '/gallery/petal-storm.jpg',
    description:
      'A storm of glowing petals cuts through a moonlit forest, framing a slashing arc of steel.',
  },
  {
    title: 'Road Beyond the Journey',
    anime: 'Frieren: Beyond Journey’s End',
    category: 'Landscape',
    file: '/gallery/road-beyond-the-journey.jpg',
    description:
      'A long road winds through quiet meadows toward distant spires under a sky caught between dusk and dawn.',
  },
];

const DEFAULT_TIER_LIST_TIERS = [
  { id: 's', name: 'S', color: '#ff8a5c' },
  { id: 'a', name: 'A', color: '#ffd166' },
  { id: 'b', name: 'B', color: '#4cd7b0' },
  { id: 'c', name: 'C', color: '#4fb7ff' },
  { id: 'd', name: 'D', color: '#8f9bb3' },
  { id: 'f', name: 'F', color: '#ff6b8a' },
  { id: 'unranked', name: 'Unranked', color: '#5c6a82' },
];

function getOrCreateUser(db, { name, email, password, role }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;

  const passwordHash = bcrypt.hashSync(password, config.bcryptRounds);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, passwordHash, role);
  return Number(result.lastInsertRowid);
}

function getAnimeId(db, title) {
  const row = db.prepare('SELECT id FROM anime WHERE title = ?').get(title);
  if (!row) throw new Error(`Seed error: anime "${title}" is missing.`);
  return row.id;
}

function getCharacter(db, name) {
  const row = db.prepare(`${CHARACTER_SELECT} WHERE c.name = ?`).get(name);
  return row ? mapCharacter(row) : null;
}

export function seedDatabase(db, { quiet = false } = {}) {
  const log = (message) => {
    if (!quiet) console.log(message);
  };
  const inserted = { tiers: 0, anime: 0, characters: 0, gallery: 0, users: 0 };

  withTransaction(db, () => {
    const insertTier = db.prepare(
      'INSERT OR IGNORE INTO tiers (key, label, order_index, description, example) VALUES (?, ?, ?, ?, ?)',
    );
    TIER_DEFINITIONS.forEach((tier, index) => {
      const result = insertTier.run(tier.key, tier.label, index, tier.description, tier.example);
      inserted.tiers += result.changes;
    });

    const insertAnime = db.prepare(
      'INSERT OR IGNORE INTO anime (title, slug, synopsis, year, studio) VALUES (?, ?, ?, ?, ?)',
    );
    for (const anime of ANIME_SEED) {
      const result = insertAnime.run(anime.title, anime.slug, anime.synopsis, anime.year, anime.studio);
      inserted.anime += result.changes;
    }

    const insertCharacter = db.prepare(`
      INSERT OR IGNORE INTO characters (
        name, alias, anime_id, description, tier,
        ap, speed, durability, strength, intelligence, stamina, hax, range_stat, combat_skill,
        hax_note, abilities, weaknesses, first_appearance, status, data_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'community')
    `);
    for (const character of CHARACTERS) {
      const animeId = getAnimeId(db, character.anime);
      const s = character.stats;
      const result = insertCharacter.run(
        character.name,
        character.alias,
        animeId,
        character.description,
        character.tier,
        s.ap,
        s.speed,
        s.durability,
        s.strength,
        s.intelligence,
        s.stamina,
        s.hax,
        s.range,
        s.combatSkill,
        character.haxNote,
        JSON.stringify(character.abilities),
        character.weaknesses,
        character.firstAppearance,
        character.status,
      );
      inserted.characters += result.changes;
    }

    const insertGallery = db.prepare(`
      INSERT OR IGNORE INTO gallery_items (title, description, anime_id, category, image_url, source_url, attribution)
      VALUES (?, ?, ?, ?, ?, NULL, ?)
    `);
    for (const item of GALLERY) {
      const animeId = getAnimeId(db, item.anime);
      const result = insertGallery.run(
        item.title,
        item.description,
        animeId,
        item.category,
        item.file,
        GALLERY_ATTRIBUTION,
      );
      inserted.gallery += result.changes;
    }

    const adminId = getOrCreateUser(db, {
      name: config.seed.adminName,
      email: config.seed.adminEmail,
      password: config.seed.adminPassword,
      role: 'admin',
    });
    const demoId = getOrCreateUser(db, {
      name: config.seed.demoName,
      email: config.seed.demoEmail,
      password: config.seed.demoPassword,
      role: 'member',
    });
    inserted.users = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;

    const adminFavoriteNames = ['Ichigo Kurosaki', 'Son Goku', 'Frieren'];
    const demoFavoriteNames = ['Satoru Gojo', 'Frieren', 'Roronoa Zoro', 'Tanjiro Kamado'];
    const addFavorite = db.prepare(
      'INSERT OR IGNORE INTO favorites (user_id, character_id) SELECT ?, id FROM characters WHERE name = ?',
    );
    for (const name of adminFavoriteNames) addFavorite.run(adminId, name);
    for (const name of demoFavoriteNames) addFavorite.run(demoId, name);

    const existingTierList = db
      .prepare('SELECT id FROM tier_lists WHERE user_id = ? AND title = ?')
      .get(adminId, 'ANIMEVERSE Starter Rankings');
    if (!existingTierList) {
      const listResult = db
        .prepare('INSERT INTO tier_lists (user_id, title, tiers_json) VALUES (?, ?, ?)')
        .run(adminId, 'ANIMEVERSE Starter Rankings', JSON.stringify(DEFAULT_TIER_LIST_TIERS));
      const listId = Number(listResult.lastInsertRowid);
      const placements = [
        ['s', ['Son Goku', 'Anos Voldigoad']],
        ['a', ['Satoru Gojo', 'Naruto Uzumaki', 'Ichigo Kurosaki']],
        ['b', ['Monkey D. Luffy', 'Vegeta']],
        ['c', ['Tanjiro Kamado', 'Frieren']],
        ['d', ['Yuji Itadori']],
      ];
      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO tier_list_items (tier_list_id, character_id, tier_key, position)
        SELECT ?, id, ?, ? FROM characters WHERE name = ?
      `);
      for (const [tierKey, names] of placements) {
        names.forEach((name, position) => insertItem.run(listId, tierKey, position, name));
      }
    }

    const existingBattle = db
      .prepare('SELECT COUNT(*) AS count FROM battles WHERE user_id = ?')
      .get(adminId).count;
    if (existingBattle === 0) {
      const goku = getCharacter(db, 'Son Goku');
      const anos = getCharacter(db, 'Anos Voldigoad');
      if (goku && anos) {
        const analysis = analyzePair(goku, anos);
        db.prepare(`
          INSERT INTO battles (user_id, character_a_id, character_b_id, result, summary, snapshot_json)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(adminId, goku.id, anos.id, analysis.result, analysis.summary, JSON.stringify(analysis));
      }
    }
  });

  log(
    `Seed complete — ${inserted.tiers} new tiers, ${inserted.anime} new anime, ` +
      `${inserted.characters} new characters, ${inserted.gallery} new gallery items. ` +
      `Demo accounts: ${config.seed.adminEmail} / ${config.seed.demoEmail}.`,
  );

  return inserted;
}
