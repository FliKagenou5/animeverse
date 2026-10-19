import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(serverRoot, '.env') });

const env = process.env;
const nodeEnv = env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

if (isProduction && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be set to at least 32 characters in production.');
}

const defaultSecret = 'animeverse-insecure-development-only-secret';

const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, '');
const configuredOrigins = (env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:4000')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);
const platformOrigins = [env.PUBLIC_ORIGIN, env.RENDER_EXTERNAL_URL]
  .filter(Boolean)
  .map(normalizeOrigin);

export const config = {
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  serverRoot,
  port: Number(env.PORT) || 4000,
  databasePath: path.resolve(serverRoot, env.DATABASE_PATH || './data/animeverse.db'),
  clientOrigins: [...new Set([...configuredOrigins, ...platformOrigins])],
  session: {
    secret: env.SESSION_SECRET || defaultSecret,
    cookieName: 'av_session',
    days: Number(env.SESSION_DAYS) || 7,
    secure: env.COOKIE_SECURE === 'true',
  },
  autoSeed: env.AUTO_SEED !== 'false',
  seed: {
    adminName: env.ADMIN_NAME || 'Aria Vance',
    adminEmail: (env.ADMIN_EMAIL || 'admin@animeverse.dev').toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD || 'Admin#1234',
    demoName: env.DEMO_NAME || 'Kai Nomura',
    demoEmail: (env.DEMO_EMAIL || 'explorer@animeverse.dev').toLowerCase(),
    demoPassword: env.DEMO_PASSWORD || 'Explore#1234',
  },
  bcryptRounds: isProduction ? 12 : 10,
};
