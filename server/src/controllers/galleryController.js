import { getDb } from '../database/index.js';
import { HttpError, notFoundError } from '../utils/httpError.js';
import { likePattern, parseId, validate } from '../utils/validation.js';
import { galleryQuerySchema } from '../validators/schemas.js';

function mapGalleryItem(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    imageUrl: row.image_url,
    sourceUrl: row.source_url,
    attribution: row.attribution,
    isFavorite: Boolean(row.is_favorite),
    anime: row.anime_title
      ? { id: row.anime_id, title: row.anime_title, slug: row.anime_slug }
      : null,
    createdAt: row.created_at,
  };
}

export function list(req, res) {
  const query = validate(galleryQuerySchema, req.query);
  const db = getDb();
  const conditions = [];
  const params = [];

  if (query.favorites === 'true' && !req.user) {
    throw new HttpError(401, 'Sign in to view favorite artwork.', 'AUTH_REQUIRED');
  }

  if (query.search) {
    conditions.push("(g.title LIKE ? ESCAPE '\\' OR g.description LIKE ? ESCAPE '\\')");
    const pattern = likePattern(query.search);
    params.push(pattern, pattern);
  }
  if (query.category) {
    conditions.push('g.category = ?');
    params.push(query.category);
  }
  if (query.animeId) {
    conditions.push('g.anime_id = ?');
    params.push(query.animeId);
  }
  if (query.favorites === 'true') {
    conditions.push(
      'EXISTS (SELECT 1 FROM gallery_favorites gf WHERE gf.gallery_item_id = g.id AND gf.user_id = ?)',
    );
    params.push(req.user.id);
  }

  const favoriteSelect = req.user
    ? 'EXISTS (SELECT 1 FROM gallery_favorites gf2 WHERE gf2.gallery_item_id = g.id AND gf2.user_id = ?) AS is_favorite'
    : '0 AS is_favorite';
  const selectParams = req.user ? [req.user.id] : [];

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT g.*, a.title AS anime_title, a.slug AS anime_slug, ${favoriteSelect}
      FROM gallery_items g
      LEFT JOIN anime a ON a.id = g.anime_id
      ${where}
      ORDER BY g.id ASC
    `)
    .all(...selectParams, ...params);

  res.json({
    data: rows.map(mapGalleryItem),
    meta: {
      categories: ['Cinematic', 'Action', 'Landscape', 'Character'],
      note: 'Seeded gallery images are original AI-generated concept art, not official frames.',
    },
  });
}

export function addFavorite(req, res) {
  const id = parseId(req.params.id, 'gallery item id');
  const db = getDb();
  const item = db.prepare('SELECT id FROM gallery_items WHERE id = ?').get(id);
  if (!item) throw notFoundError('Gallery item');

  db.prepare('INSERT OR IGNORE INTO gallery_favorites (user_id, gallery_item_id) VALUES (?, ?)').run(
    req.user.id,
    id,
  );
  res.json({ favorited: true, galleryItemId: id });
}

export function removeFavorite(req, res) {
  const id = parseId(req.params.id, 'gallery item id');
  getDb()
    .prepare('DELETE FROM gallery_favorites WHERE user_id = ? AND gallery_item_id = ?')
    .run(req.user.id, id);
  res.status(204).end();
}
