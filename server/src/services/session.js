import crypto from 'node:crypto';
import { config } from '../config.js';

export function hashSessionToken(token) {
  return crypto.createHmac('sha256', config.session.secret).update(token).digest('hex');
}

export function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() + config.session.days * 24 * 60 * 60 * 1000,
  ).toISOString();

  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    tokenHash,
    userId,
    expiresAt,
  );

  return { token, expiresAt };
}

export function setSessionCookie(res, token) {
  res.cookie(config.session.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.session.secure,
    path: '/',
    maxAge: config.session.days * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.session.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.session.secure,
    path: '/',
  });
}
