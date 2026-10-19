import { getDb } from '../database/index.js';
import { CHARACTER_SELECT, mapCharacter } from '../utils/mappers.js';

function mapBattleSummary(row) {
  let snapshot = null;
  try {
    snapshot = JSON.parse(row.snapshot_json);
  } catch {
    snapshot = null;
  }
  return {
    id: row.id,
    result: row.result,
    summary: row.summary,
    createdAt: row.created_at,
    characterA: snapshot?.characterA
      ? { id: snapshot.characterA.id, name: snapshot.characterA.name }
      : null,
    characterB: snapshot?.characterB
      ? { id: snapshot.characterB.id, name: snapshot.characterB.name }
      : null,
  };
}

export function stats(req, res) {
  const db = getDb();

  const totals = db
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM characters) AS characters,
        (SELECT COUNT(*) FROM anime) AS anime,
        (SELECT COUNT(*) FROM tiers) AS tiers,
        (SELECT COUNT(*) FROM gallery_items) AS gallery,
        (SELECT COUNT(*) FROM favorites) AS favorites,
        (SELECT COUNT(*) FROM battles) AS battles
    `)
    .get();

  let user = null;
  let recentBattles = [];
  if (req.user) {
    const row = db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM favorites WHERE user_id = ?) AS favorites,
          (SELECT COUNT(*) FROM battles WHERE user_id = ?) AS battles,
          (SELECT COUNT(*) FROM tier_lists WHERE user_id = ?) AS tierLists
      `)
      .get(req.user.id, req.user.id, req.user.id);
    user = row;

    recentBattles = db
      .prepare('SELECT * FROM battles WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 3')
      .all(req.user.id)
      .map(mapBattleSummary);
  }

  const popularRows = db
    .prepare(`
      SELECT c.*, a.title AS anime_title, a.slug AS anime_slug,
        t.label AS tier_label, t.order_index AS tier_order,
        (SELECT COUNT(*) FROM favorites f WHERE f.character_id = c.id) AS favorite_count,
        (SELECT COUNT(*) FROM battles b WHERE b.character_a_id = c.id OR b.character_b_id = c.id) AS battle_count
      FROM characters c
      JOIN anime a ON a.id = c.anime_id
      JOIN tiers t ON t.key = c.tier
      ORDER BY (favorite_count * 2 + battle_count) DESC,
        t.order_index ASC, c.name COLLATE NOCASE ASC
      LIMIT 5
    `)
    .all();

  const recentRows = db
    .prepare(`${CHARACTER_SELECT} ORDER BY c.created_at DESC, c.id DESC LIMIT 6`)
    .all();

  const topTierRows = db
    .prepare(`${CHARACTER_SELECT} ORDER BY t.order_index ASC, c.name COLLATE NOCASE ASC LIMIT 6`)
    .all();

  res.json({
    totals: {
      characters: totals.characters,
      anime: totals.anime,
      tiers: totals.tiers,
      gallery: totals.gallery,
    },
    activity: {
      favorites: totals.favorites,
      battles: totals.battles,
    },
    user,
    popular: popularRows.map((row) => ({
      character: mapCharacter(row),
      favorites: row.favorite_count,
      battles: row.battle_count,
      signal: row.favorite_count * 2 + row.battle_count,
    })),
    recent: recentRows.map(mapCharacter),
    topTier: topTierRows.map(mapCharacter),
    recentBattles,
  });
}
