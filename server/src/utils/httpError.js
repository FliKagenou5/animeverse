export class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR', details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFoundError(what = 'Resource') {
  return new HttpError(404, `${what} not found.`, 'NOT_FOUND');
}
