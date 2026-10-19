import fs from 'node:fs';
import { config } from '../config.js';
import { openDatabase, migrate } from './index.js';
import { seedDatabase } from './seed.js';

const command = process.argv[2] || 'seed';

function openMigrated() {
  const db = openDatabase();
  migrate(db);
  return db;
}

try {
  if (command === 'migrate') {
    const db = openMigrated();
    const version = db.prepare('PRAGMA user_version').get().user_version;
    console.log(`Migrations applied. Schema version: ${version}`);
    console.log(`Database: ${config.databasePath}`);
    db.close();
  } else if (command === 'seed') {
    const db = openMigrated();
    seedDatabase(db);
    console.log(`Database: ${config.databasePath}`);
    db.close();
  } else if (command === 'reset') {
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(`${config.databasePath}${suffix}`, { force: true });
    }
    console.log(`Removed local database at ${config.databasePath}`);
    const db = openMigrated();
    seedDatabase(db);
    console.log(`Fresh database ready at ${config.databasePath}`);
    db.close();
  } else {
    console.error(`Unknown command "${command}". Use migrate, seed or reset.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
