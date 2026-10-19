export const CHARACTER_SELECT = `
  SELECT
    c.*,
    a.title AS anime_title,
    a.slug AS anime_slug,
    t.label AS tier_label,
    t.order_index AS tier_order
  FROM characters c
  JOIN anime a ON a.id = c.anime_id
  JOIN tiers t ON t.key = c.tier
`;

export function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mapCharacter(row) {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias || null,
    animeId: row.anime_id,
    anime: {
      id: row.anime_id,
      title: row.anime_title,
      slug: row.anime_slug,
    },
    description: row.description,
    imageUrl: row.image_url || null,
    tier: {
      key: row.tier,
      label: row.tier_label,
      orderIndex: row.tier_order,
    },
    stats: {
      ap: row.ap,
      speed: row.speed,
      durability: row.durability,
      strength: row.strength,
      intelligence: row.intelligence,
      stamina: row.stamina,
      hax: row.hax,
      range: row.range_stat,
      combatSkill: row.combat_skill,
    },
    haxNote: row.hax_note || '',
    abilities: parseJsonArray(row.abilities),
    weaknesses: row.weaknesses || '',
    firstAppearance: row.first_appearance || null,
    status: row.status,
    dataSource: row.data_source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAnime(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    synopsis: row.synopsis,
    year: row.year,
    studio: row.studio,
    characterCount: row.character_count ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTier(row) {
  return {
    key: row.key,
    label: row.label,
    orderIndex: row.order_index,
    description: row.description,
    example: row.example,
    characterCount: row.character_count ?? 0,
  };
}
