import { defineComponent } from 'vue'
import { mockComponent } from '@nuxt/test-utils/runtime';
import { beforeAll } from 'vitest'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { useRuntimeConfig } from '#imports';
import * as schema from '../db/schema';

beforeAll(() => {
  mockComponent('RoutesMap', () => {
    return defineComponent(
      {
        default: {
          name: 'RoutesMap',
          template: '<div data-testid="mocked-map">Mocked Map</div>'
        }
      }
    )}
  );
});

async function runAppMigrations(db:BetterSQLite3Database) {
  await migrate(db, { migrationsFolder: './db/migrations' });
}

// the app DB client connects before this file runs. If this simply deletes
// the sqlite file the tests fails because the DB is unlinked. It would be nice
// if we could loop over all the tables an do this but i didnt feel like writing
// that code so right now this just deletes the tables contents lead to root in
// terms of foreign key deps.
async function destroyTestDB(db:BetterSQLite3Database) {
  // wrapped in a try so if the DB/tables dont exists this doesn't throw
  try {
    await db.delete(schema.broadcasts);
    await db.delete(schema.reports);
  } catch (e) {}
}

beforeAll(async () => {
  const config = useRuntimeConfig();
  const sqlite = new Database(config.dbFileName!, {
    readonly: false
  });
  const db = drizzle(sqlite);

  await destroyTestDB(db);

  await runAppMigrations(db);

  sqlite.close();
});