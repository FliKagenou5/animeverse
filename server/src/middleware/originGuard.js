import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function originGuard(req, _res, next) {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  if (config.clientOrigins.includes(origin)) return next();
  return next(new HttpError(403, 'This origin is not allowed to modify data.', 'ORIGIN_REJECTED'));
}
