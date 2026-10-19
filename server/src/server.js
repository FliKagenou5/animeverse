import { createApp } from './app.js';
import { config } from './config.js';
import { closeDb, getDb, isDatabaseEmpty } from './database/index.js';
import { seedDatabase } from './database/seed.js';

const db = getDb();

if (config.autoSeed && isDatabaseEmpty(db)) {
  console.log('[db] Empty database detected — seeding demo content.');
  seedDatabase(db);
  console.log(`[db] Demo accounts: ${config.seed.adminEmail} (admin), ${config.seed.demoEmail} (member).`);
}

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[api] ANIMEVERSE API listening on http://localhost:${config.port}`);
  console.log(`[api] Database: ${config.databasePath}`);
  console.log(`[api] Allowed origins: ${config.clientOrigins.join(', ')}`);
});

function shutdown(signal) {
  console.log(`\n[api] ${signal} received — shutting down.`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
