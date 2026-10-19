import { CHARACTER_SELECT, mapCharacter } from '../utils/mappers.js';
import { likePattern } from '../utils/validation.js';

const SORT_SQL = {
  name_asc: 'c.name COLLATE NOCASE ASC, c.id ASC',
  name_desc: 'c.name COLLATE NOCASE DESC, c.id DESC',
  newest: 'c.created_at DESC, c.id DESC',
  oldest: 'c.created_at ASC, c.id ASC',
  tier_asc: 't.order_index ASC, c.name COLLATE NOCASE ASC',
  tier_desc: 't.order_index DESC, c.name COLLATE NOCASE ASC',
  updated_desc: 'c.updated_at DESC, c.id DESC',
};

export function listCharacters(db, options) {
  const { page, limit, search, animeId, tier, status, sort } = options;
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("(c.name LIKE ? ESCAPE '\\' OR COALESCE(c.alias, '') LIKE ? ESCAPE '\\')");
    const pattern = likePattern(search);
    params.push(pattern, pattern);
  }
  if (animeId) {
    conditions.push('c.anime_id = ?');
    params.push(animeId);
  }
  if (tier) {
    conditions.push('c.tier = ?');
    params.push(tier);
  }
  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const orderBy = SORT_SQL[sort] || SORT_SQL.name_asc;

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM characters c ${where}`)
    .get(...params).count;

  const rows = db
    .prepare(`${CHARACTER_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return {
    data: rows.map(mapCharacter),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function findCharacterById(db, id) {
  const row = db.prepare(`${CHARACTER_SELECT} WHERE c.id = ?`).get(id);
  return row ? mapCharacter(row) : null;
}

export function assertAnimeAndTier(db, animeId, tier) {
  const anime = db.prepare('SELECT id FROM anime WHERE id = ?').get(animeId);
  const tierRow = db.prepare('SELECT key FROM tiers WHERE key = ?').get(tier);
  return { animeExists: Boolean(anime), tierExists: Boolean(tierRow) };
}

export function characterValues(payload) {
  return [
    payload.name,
    payload.alias ?? null,
    payload.animeId,
    payload.description,
    payload.imageUrl ?? null,
    payload.tier,
    payload.ap,
    payload.speed,
    payload.durability,
    payload.strength,
    payload.intelligence,
    payload.stamina,
    payload.hax,
    payload.range,
    payload.combatSkill,
    payload.haxNote ?? '',
    JSON.stringify(payload.abilities ?? []),
    payload.weaknesses,
    payload.firstAppearance ?? null,
    payload.status,
    payload.dataSource,
  ];
}
