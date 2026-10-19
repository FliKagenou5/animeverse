import { HttpError } from './httpError.js';

export function parseId(value, label = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `Invalid ${label}.`, 'INVALID_ID');
  }
  return id;
}

export function validate(schema, payload) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new HttpError(
      400,
      'Please check the highlighted fields and try again.',
      'VALIDATION_ERROR',
      result.error.flatten(),
    );
  }
  return result.data;
}

export function likePattern(search) {
  const escaped = search.replace(/[\\%_]/g, '\\$&');
  return `%${escaped}%`;
}

export function uniqueSlug(db, title, table, currentId = null) {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'item';

  let slug = base;
  let suffix = 1;
  const query =
    currentId === null
      ? `SELECT 1 FROM ${table} WHERE slug = ?`
      : `SELECT 1 FROM ${table} WHERE slug = ? AND id <> ?`;

  while (
    currentId === null
      ? db.prepare(query).get(slug)
      : db.prepare(query).get(slug, currentId)
  ) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}
