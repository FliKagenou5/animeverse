import { getDb } from '../database/index.js';
import {
  assertAnimeAndTier,
  characterValues,
  findCharacterById,
  listCharacters,
} from '../services/characterService.js';
import { HttpError, notFoundError } from '../utils/httpError.js';
import { parseId, validate } from '../utils/validation.js';
import { characterQuerySchema, characterSchema } from '../validators/schemas.js';

const INSERT_SQL = `
  INSERT INTO characters (
    name, alias, anime_id, description, image_url, tier,
    ap, speed, durability, strength, intelligence, stamina, hax, range_stat, combat_skill,
    hax_note, abilities, weaknesses, first_appearance, status, data_source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const UPDATE_SQL = `
  UPDATE characters SET
    name = ?, alias = ?, anime_id = ?, description = ?, image_url = ?, tier = ?,
    ap = ?, speed = ?, durability = ?, strength = ?, intelligence = ?, stamina = ?, hax = ?,
    range_stat = ?, combat_skill = ?, hax_note = ?, abilities = ?, weaknesses = ?,
    first_appearance = ?, status = ?, data_source = ?,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = ?
`;

function assertReferences(db, payload) {
  const { animeExists, tierExists } = assertAnimeAndTier(db, payload.animeId, payload.tier);
  if (!animeExists) throw new HttpError(400, 'The selected anime does not exist.', 'INVALID_ANIME');
  if (!tierExists) throw new HttpError(400, 'The selected tier does not exist.', 'INVALID_TIER');
}

function assertNoDuplicate(db, payload, currentId = null) {
  const duplicate = currentId
    ? db
        .prepare('SELECT id FROM characters WHERE name = ? AND anime_id = ? AND id <> ?')
        .get(payload.name, payload.animeId, currentId)
    : db
        .prepare('SELECT id FROM characters WHERE name = ? AND anime_id = ?')
        .get(payload.name, payload.animeId);
  if (duplicate) {
    throw new HttpError(
      409,
      'That character already exists for this anime.',
      'DUPLICATE_CHARACTER',
    );
  }
}

export function list(req, res) {
  const query = validate(characterQuerySchema, req.query);
  res.json(listCharacters(getDb(), query));
}

export function getOne(req, res) {
  const id = parseId(req.params.id, 'character id');
  const character = findCharacterById(getDb(), id);
  if (!character) throw notFoundError('Character');
  res.json({ character });
}

export function create(req, res) {
  const payload = validate(characterSchema, req.body);
  const db = getDb();
  assertReferences(db, payload);
  assertNoDuplicate(db, payload);

  const result = db.prepare(INSERT_SQL).run(...characterValues(payload));
  const created = findCharacterById(db, Number(result.lastInsertRowid));
  res.status(201).json({ character: created });
}

export function update(req, res) {
  const id = parseId(req.params.id, 'character id');
  const payload = validate(characterSchema, req.body);
  const db = getDb();
  if (!findCharacterById(db, id)) throw notFoundError('Character');
  assertReferences(db, payload);
  assertNoDuplicate(db, payload, id);

  db.prepare(UPDATE_SQL).run(...characterValues(payload), id);
  res.json({ character: findCharacterById(db, id) });
}

export function remove(req, res) {
  const id = parseId(req.params.id, 'character id');
  const db = getDb();
  const result = db.prepare('DELETE FROM characters WHERE id = ?').run(id);
  if (!result.changes) throw notFoundError('Character');
  res.status(204).end();
}
