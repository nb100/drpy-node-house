import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import config from '../src/config.js';

async function runMigrations() {
  console.log('Starting migration...');

  // Ensure data directory exists
  if (!fs.existsSync(config.paths.data)) {
    fs.mkdirSync(config.paths.data, { recursive: true });
    console.log(`Created data directory: ${config.paths.data}`);
  }

  const dbPath = path.join(config.paths.data, config.db.filename);
  console.log(`Database path: ${dbPath}`);

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  try {
    // This will automatically read migrations from the 'drizzle' folder
    // and apply them to the database using bun:sqlite
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

runMigrations();
