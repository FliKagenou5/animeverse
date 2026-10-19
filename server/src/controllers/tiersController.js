import { getDb } from '../database/index.js';
import { mapTier } from '../utils/mappers.js';
import { HttpError, notFoundError } from '../utils/httpError.js';
import { validate } from '../utils/validation.js';
import { tierUpdateSchema } from '../validators/schemas.js';

const SELECT_SQL = `
  SELECT t.*, COUNT(c.id) AS character_count
  FROM tiers t
  LEFT JOIN characters c ON c.tier = t.key
`;

export function list(_req, res) {
  const rows = getDb()
    .prepare(`${SELECT_SQL} GROUP BY t.key ORDER BY t.order_index ASC`)
    .all();
  res.json({ data: rows.map(mapTier) });
}

export function update(req, res) {
  const key = String(req.params.key);
  const payload = validate(tierUpdateSchema, req.body);
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tiers WHERE key = ?').get(key);
  if (!existing) throw notFoundError('Tier');

  if (payload.orderIndex !== undefined && payload.orderIndex !== existing.order_index) {
    const conflict = db
      .prepare('SELECT key FROM tiers WHERE order_index = ? AND key <> ?')
      .get(payload.orderIndex, key);
    if (conflict) {
      throw new HttpError(
        409,
        'Another tier already uses that order position.',
        'TIER_ORDER_CONFLICT',
      );
    }
  }

  db.prepare(`
    UPDATE tiers SET label = ?, description = ?, example = ?, order_index = ?
    WHERE key = ?
  `).run(
    payload.label ?? existing.label,
    payload.description ?? existing.description,
    payload.example ?? existing.example,
    payload.orderIndex ?? existing.order_index,
    key,
  );

  const row = db
    .prepare(`${SELECT_SQL} WHERE t.key = ? GROUP BY t.key`)
    .get(key);
  res.json({ tier: mapTier(row) });
}
