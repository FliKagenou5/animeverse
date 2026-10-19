import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { getDb } from '../database/index.js';
import { attachUser } from '../middleware/auth.js';
import { clearSessionCookie, createSession, setSessionCookie } from '../services/session.js';
import { HttpError } from '../utils/httpError.js';
import { validate } from '../utils/validation.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function register(req, res) {
  const payload = validate(registerSchema, req.body);
  const db = getDb();

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(payload.email);
  if (exists) {
    throw new HttpError(409, 'An account with that email already exists.', 'EMAIL_TAKEN');
  }

  const passwordHash = bcrypt.hashSync(payload.password, config.bcryptRounds);
  let result;
  try {
    result = db
      .prepare(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'member')",
      )
      .run(payload.name, payload.email, passwordHash);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      throw new HttpError(409, 'An account with that email already exists.', 'EMAIL_TAKEN');
    }
    throw error;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
  const { token } = createSession(db, user.id);
  setSessionCookie(res, token);

  res.status(201).json({ user: publicUser(user) });
}

export function login(req, res) {
  const payload = validate(loginSchema, req.body);
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(payload.email);

  const valid = user && bcrypt.compareSync(payload.password, user.password_hash);
  if (!valid) {
    throw new HttpError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  }

  const { token } = createSession(db, user.id);
  setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
}

export function logout(req, res) {
  if (req.sessionTokenHash) {
    getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.sessionTokenHash);
  }
  clearSessionCookie(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ user: req.user || null });
}

export const authMiddleware = attachUser;
