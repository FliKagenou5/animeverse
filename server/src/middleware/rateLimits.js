import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const skip = () => config.isTest;

const handler = (_req, res) => {
  res.status(429).json({
    error: {
      message: 'Too many requests. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
    },
  });
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 900,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  handler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  handler,
});

export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  handler,
});

export const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  handler,
});
