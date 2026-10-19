import { config } from '../config.js';
import { getDb } from '../database/index.js';
import { hashSessionToken } from '../services/session.js';
import { HttpError } from '../utils/httpError.js';

export function attachUser(req, _res, next) {
  const token = req.cookies?.[config.session.cookieName];
  if (!token) return next();

  const db = getDb();
  const tokenHash = hashSessionToken(token);
  const row = db
    .prepare(`
      SELECT s.expires_at, u.id, u.name, u.email, u.role, u.created_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
    `)
    .get(tokenHash);

  if (!row) return next();

  if (row.expires_at <= new Date().toISOString()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return next();
  }

  req.user = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
  req.sessionTokenHash = tokenHash;
  return next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) {
    return next(new HttpError(401, 'Sign in to use this feature.', 'AUTH_REQUIRED'));
  }
  return next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(new HttpError(401, 'Sign in to use this feature.', 'AUTH_REQUIRED'));
  }
  if (req.user.role !== 'admin') {
    return next(new HttpError(403, 'Admin access is required.', 'FORBIDDEN'));
  }
  return next();
}
