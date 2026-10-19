import { getDb, withTransaction } from '../database/index.js';
import { mapCharacter, parseJsonArray } from '../utils/mappers.js';
import { HttpError, notFoundError } from '../utils/httpError.js';
import { parseId, validate } from '../utils/validation.js';
import { tierListSchema } from '../validators/schemas.js';

function loadTierList(db, id, userId) {
  const row = db
    .prepare('SELECT * FROM tier_lists WHERE id = ? AND user_id = ?')
    .get(id, userId);
  if (!row) return null;

  const itemRows = db
    .prepare(`
      SELECT i.tier_key AS placement_tier, i.position AS placement_position,
        c.*, a.title AS anime_title, a.slug AS anime_slug,
        t.label AS tier_label, t.order_index AS tier_order
      FROM tier_list_items i
      JOIN characters c ON c.id = i.character_id
      JOIN anime a ON a.id = c.anime_id
      JOIN tiers t ON t.key = c.tier
      WHERE i.tier_list_id = ?
      ORDER BY i.position ASC, i.id ASC
    `)
    .all(id);

  return {
    id: row.id,
    title: row.title,
    tiers: parseJsonArray(row.tiers_json),
    items: itemRows.map((item) => ({
      characterId: item.id,
      tierId: item.placement_tier,
      position: item.placement_position,
      character: mapCharacter(item),
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertReferences(db, payload) {
  const tierIds = new Set(payload.tiers.map((tier) => tier.id));
  if (tierIds.size !== payload.tiers.length) {
    throw new HttpError(400, 'Tier ids must be unique.', 'DUPLICATE_TIER_ID');
  }
  const characterIds = payload.items.map((item) => item.characterId);
  if (new Set(characterIds).size !== characterIds.length) {
    throw new HttpError(400, 'A character can only appear once in a tier list.', 'DUPLICATE_ITEM');
  }
  for (const item of payload.items) {
    if (!tierIds.has(item.tierId)) {
      throw new HttpError(400, 'An item refers to a tier that does not exist.', 'INVALID_TIER_REF');
    }
  }
  if (characterIds.length) {
    const placeholders = characterIds.map(() => '?').join(',');
    const found = db
      .prepare(`SELECT COUNT(*) AS count FROM characters WHERE id IN (${placeholders})`)
      .get(...characterIds).count;
    if (found !== characterIds.length) {
      throw new HttpError(400, 'One or more characters no longer exist.', 'INVALID_CHARACTER_REF');
    }
  }
}

function insertItems(db, tierListId, items) {
  const statement = db.prepare(`
    INSERT INTO tier_list_items (tier_list_id, character_id, tier_key, position)
    VALUES (?, ?, ?, ?)
  `);
  const counters = new Map();
  for (const item of items) {
    const position = counters.get(item.tierId) ?? 0;
    counters.set(item.tierId, position + 1);
    statement.run(tierListId, item.characterId, item.tierId, position);
  }
}

export function list(req, res) {
  const rows = getDb()
    .prepare(`
      SELECT l.*, (SELECT COUNT(*) FROM tier_list_items i WHERE i.tier_list_id = l.id) AS item_count
      FROM tier_lists l
      WHERE l.user_id = ?
      ORDER BY l.updated_at DESC, l.id DESC
    `)
    .all(req.user.id);

  res.json({
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      itemCount: row.item_count,
      tiers: parseJsonArray(row.tiers_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
}

export function getOne(req, res) {
  const id = parseId(req.params.id, 'tier list id');
  const list = loadTierList(getDb(), id, req.user.id);
  if (!list) throw notFoundError('Tier list');
  res.json({ tierList: list });
}

export function create(req, res) {
  const payload = validate(tierListSchema, req.body);
  const db = getDb();
  const count = db
    .prepare('SELECT COUNT(*) AS count FROM tier_lists WHERE user_id = ?')
    .get(req.user.id).count;
  if (count >= 50) {
    throw new HttpError(409, 'You have reached the 50 tier-list limit.', 'TIER_LIST_LIMIT');
  }
  assertReferences(db, payload);

  const listId = withTransaction(db, () => {
    const result = db
      .prepare('INSERT INTO tier_lists (user_id, title, tiers_json) VALUES (?, ?, ?)')
      .run(req.user.id, payload.title, JSON.stringify(payload.tiers));
    const id = Number(result.lastInsertRowid);
    insertItems(db, id, payload.items);
    return id;
  });

  res.status(201).json({ tierList: loadTierList(db, listId, req.user.id) });
}

export function update(req, res) {
  const id = parseId(req.params.id, 'tier list id');
  const payload = validate(tierListSchema, req.body);
  const db = getDb();
  if (!loadTierList(db, id, req.user.id)) throw notFoundError('Tier list');
  assertReferences(db, payload);

  withTransaction(db, () => {
    db.prepare(`
      UPDATE tier_lists SET title = ?, tiers_json = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ? AND user_id = ?
    `).run(payload.title, JSON.stringify(payload.tiers), id, req.user.id);
    db.prepare('DELETE FROM tier_list_items WHERE tier_list_id = ?').run(id);
    insertItems(db, id, payload.items);
  });

  res.json({ tierList: loadTierList(db, id, req.user.id) });
}

export function remove(req, res) {
  const id = parseId(req.params.id, 'tier list id');
  const result = getDb()
    .prepare('DELETE FROM tier_lists WHERE id = ? AND user_id = ?')
    .run(id, req.user.id);
  if (!result.changes) throw notFoundError('Tier list');
  res.status(204).end();
}
