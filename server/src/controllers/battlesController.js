import { getDb } from '../database/index.js';
import { analyzePair } from '../services/battleAnalysis.js';
import { findCharacterById } from '../services/characterService.js';
import { notFoundError } from '../utils/httpError.js';
import { HttpError } from '../utils/httpError.js';
import { parseId, validate } from '../utils/validation.js';
import { battleSchema } from '../validators/schemas.js';

function loadPair(db, payload) {
  if (payload.characterAId === payload.characterBId) {
    throw new HttpError(400, 'Choose two different characters.', 'SAME_CHARACTER');
  }
  const characterA = findCharacterById(db, payload.characterAId);
  if (!characterA) throw notFoundError('First character');
  const characterB = findCharacterById(db, payload.characterBId);
  if (!characterB) throw notFoundError('Second character');
  return { characterA, characterB };
}

function mapBattle(row) {
  let analysis = null;
  try {
    analysis = JSON.parse(row.snapshot_json);
  } catch {
    analysis = null;
  }
  return {
    id: row.id,
    result: row.result,
    summary: row.summary,
    createdAt: row.created_at,
    analysis,
  };
}

export function analyze(req, res) {
  const payload = validate(battleSchema, req.body);
  const { characterA, characterB } = loadPair(getDb(), payload);
  res.json({ analysis: analyzePair(characterA, characterB) });
}

export function save(req, res) {
  const payload = validate(battleSchema, req.body);
  const db = getDb();
  const { characterA, characterB } = loadPair(db, payload);
  const analysis = analyzePair(characterA, characterB);

  const result = db
    .prepare(`
      INSERT INTO battles (user_id, character_a_id, character_b_id, result, summary, snapshot_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      req.user.id,
      characterA.id,
      characterB.id,
      analysis.result,
      analysis.summary,
      JSON.stringify(analysis),
    );

  const row = db.prepare('SELECT * FROM battles WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ battle: mapBattle(row) });
}

export function list(req, res) {
  const rows = getDb()
    .prepare('SELECT * FROM battles WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50')
    .all(req.user.id);
  res.json({ data: rows.map(mapBattle) });
}

export function getOne(req, res) {
  const id = parseId(req.params.id, 'battle id');
  const row = getDb()
    .prepare('SELECT * FROM battles WHERE id = ? AND user_id = ?')
    .get(id, req.user.id);
  if (!row) throw notFoundError('Saved battle');
  res.json({ battle: mapBattle(row) });
}
