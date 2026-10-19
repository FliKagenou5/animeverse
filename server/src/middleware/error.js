import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';

export function apiNotFound(req, res) {
  res.status(404).json({
    error: {
      message: `No API route matches ${req.method} ${req.originalUrl}.`,
      code: 'ROUTE_NOT_FOUND',
    },
  });
}

export function errorHandler(error, req, res, _next) {
  if (res.headersSent) return;

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: {
        message: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { message: 'Request body must be valid JSON.', code: 'INVALID_JSON' },
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: { message: 'Request body is too large.', code: 'PAYLOAD_TOO_LARGE' },
    });
  }

  console.error(`[api] ${req.method} ${req.originalUrl} failed:`, error);

  return res.status(500).json({
    error: {
      message: 'The server could not complete this request.',
      code: 'INTERNAL_ERROR',
      ...(config.isProduction ? {} : { details: { debug: error.message } }),
    },
  });
}
