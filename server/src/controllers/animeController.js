import { getDb } from '../database/index.js';
import { CHARACTER_SELECT, mapAnime, mapCharacter } from '../utils/mappers.js';
import { HttpError, notFoundError } from '../utils/httpError.js';
import { parseId, uniqueSlug, validate } from '../utils/validation.js';
import { animeSchema } from '../validators/schemas.js';

const LIST_SQL = `
  SELECT a.*,
    (SELECT COUNT(*) FROM characters c WHERE c.anime_id = a.id) AS character_count
  FROM anime a
  ORDER BY a.title COLLATE NOCASE ASC
`;

const SINGLE_SQL = `
  SELECT a.*,
    (SELECT COUNT(*) FROM characters c WHERE c.anime_id = a.id) AS character_count
  FROM anime a
  WHERE a.id = ?
`;

function getAnime(db, id) {
  return db.prepare(SINGLE_SQL).get(id);
}

export function list(_req, res) {
  const rows = getDb().prepare(LIST_SQL).all();
  res.json({ data: rows.map(mapAnime) });
}

export function getOne(req, res) {
  const id = parseId(req.params.id, 'anime id');
  const db = getDb();
  const row = getAnime(db, id);
  if (!row) throw notFoundError('Anime');

  const characters = db
    .prepare(`${CHARACTER_SELECT} WHERE c.anime_id = ? ORDER BY c.name COLLATE NOCASE ASC`)
    .all(id)
    .map(mapCharacter);

  res.json({ anime: mapAnime(row), characters });
}

export function create(req, res) {
  const payload = validate(animeSchema, req.body);
  const db = getDb();

  if (db.prepare('SELECT id FROM anime WHERE title = ? COLLATE NOCASE').get(payload.title)) {
    throw new HttpError(409, 'An anime with that title already exists.', 'DUPLICATE_ANIME');
  }

  const slug = uniqueSlug(db, payload.title, 'anime');
  const result = db
    .prepare('INSERT INTO anime (title, slug, synopsis, year, studio) VALUES (?, ?, ?, ?, ?)')
    .run(payload.title, slug, payload.synopsis, payload.year ?? null, payload.studio ?? null);

  res.status(201).json({ anime: mapAnime(getAnime(db, Number(result.lastInsertRowid))) });
}

export function update(req, res) {
  const id = parseId(req.params.id, 'anime id');
  const payload = validate(animeSchema, req.body);
  const db = getDb();
  const existing = getAnime(db, id);
  if (!existing) throw notFoundError('Anime');

  const duplicate = db
    .prepare('SELECT id FROM anime WHERE title = ? COLLATE NOCASE AND id <> ?')
    .get(payload.title, id);
  if (duplicate) {
    throw new HttpError(409, 'An anime with that title already exists.', 'DUPLICATE_ANIME');
  }

  const slug = uniqueSlug(db, payload.title, 'anime', id);
  db.prepare(`
    UPDATE anime SET title = ?, slug = ?, synopsis = ?, year = ?, studio = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `).run(
    payload.title,
    slug,
    payload.synopsis,
    payload.year ?? null,
    payload.studio ?? null,
    id,
  );

  res.json({ anime: mapAnime(getAnime(db, id)) });
}

export function remove(req, res) {
  const id = parseId(req.params.id, 'anime id');
  const db = getDb();
  const existing = getAnime(db, id);
  if (!existing) throw notFoundError('Anime');
  if (existing.character_count > 0) {
    throw new HttpError(
      409,
      'This anime still has characters. Move or delete them first.',
      'ANIME_IN_USE',
    );
  }
  db.prepare('DELETE FROM anime WHERE id = ?').run(id);
  res.status(204).end();
}
