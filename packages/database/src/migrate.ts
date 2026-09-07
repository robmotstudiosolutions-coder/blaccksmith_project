import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from './index.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to apply migrations.');
const { db, client } = createDatabase(databaseUrl);
try { await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) }); }
finally { await client.end(); }

