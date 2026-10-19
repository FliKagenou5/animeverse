import { getDb } from '../database/index.js';
import { findCharacterById } from '../services/characterService.js';
import { mapCharacter } from '../utils/mappers.js';
import { notFoundError } from '../utils/httpError.js';
import { likePattern, parseId, validate } from '../utils/validation.js';
import { favoriteSchema, favoritesQuerySchema } from '../validators/schemas.js';

const SORT_SQL = {
  recent: 'f.created_at DESC, c.name COLLATE NOCASE ASC',
  name_asc: 'c.name COLLATE NOCASE ASC',
  name_desc: 'c.name COLLATE NOCASE DESC',
};

export function list(req, res) {
  const query = validate(favoritesQuerySchema, req.query);
  const db = getDb();
  const conditions = ['f.user_id = ?'];
  const params = [req.user.id];

  if (query.search) {
    conditions.push("(c.name LIKE ? ESCAPE '\\' OR COALESCE(c.alias, '') LIKE ? ESCAPE '\\')");
    const pattern = likePattern(query.search);
    params.push(pattern, pattern);
  }

  const rows = db
    .prepare(`
      SELECT c.*, a.title AS anime_title, a.slug AS anime_slug,
        t.label AS tier_label, t.order_index AS tier_order, f.created_at AS favorited_at
      FROM favorites f
      JOIN characters c ON c.id = f.character_id
      JOIN anime a ON a.id = c.anime_id
      JOIN tiers t ON t.key = c.tier
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${SORT_SQL[query.sort]}
    `)
    .all(...params);

  res.json({
    data: rows.map((row) => ({ ...mapCharacter(row), favoritedAt: row.favorited_at })),
    count: rows.length,
  });
}

export function ids(req, res) {
  const rows = getDb()
    .prepare('SELECT character_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ characterIds: rows.map((row) => row.character_id) });
}

export function add(req, res) {
  const payload = validate(favoriteSchema, req.body);
  const db = getDb();
  if (!findCharacterById(db, payload.characterId)) throw notFoundError('Character');

  const result = db
    .prepare('INSERT OR IGNORE INTO favorites (user_id, character_id) VALUES (?, ?)')
    .run(req.user.id, payload.characterId);
  const count = db
    .prepare('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?')
    .get(req.user.id).count;

  res.status(result.changes ? 201 : 200).json({
    favorited: true,
    characterId: payload.characterId,
    count,
  });
}

export function remove(req, res) {
  const characterId = parseId(req.params.characterId, 'character id');
  getDb()
    .prepare('DELETE FROM favorites WHERE user_id = ? AND character_id = ?')
    .run(req.user.id, characterId);
  res.status(204).end();
}
