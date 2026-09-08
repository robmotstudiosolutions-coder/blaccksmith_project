import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10 });
  const db = drizzle(client, { schema });
  for (const type of ['1184', '1082', '1083', '1114']) {
    client.options.serializers[type as any] = (x: any) =>
      x instanceof Date ? x.toISOString() : typeof x === 'string' ? x : new Date(x).toISOString();
  }
  return { db, client };
}
export * from './schema.js';

