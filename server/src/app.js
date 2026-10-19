import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { getDb } from './database/index.js';
import { attachUser } from './middleware/auth.js';
import { apiNotFound, errorHandler } from './middleware/error.js';
import { originGuard } from './middleware/originGuard.js';
import { globalLimiter } from './middleware/rateLimits.js';
import apiRoutes from './routes/index.js';
import { HttpError } from './utils/httpError.js';

export function createApp() {
  getDb();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.clientOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new HttpError(403, 'This origin is not allowed.', 'ORIGIN_REJECTED'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(attachUser);
  app.use(originGuard);
  app.use('/api', globalLimiter);

  app.get('/api/health', (_req, res) => {
    getDb().prepare('SELECT 1').get();
    res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
  });

  app.use('/api', apiRoutes);
  app.use('/api', apiNotFound);

  const clientDist = path.resolve(config.serverRoot, '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1h', index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      return res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
