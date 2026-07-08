import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as appSchema from '../db/schema';

const config = useRuntimeConfig();

const sqlite = new Database(config.dbFileName!);
sqlite.pragma('journal_mode = WAL');
const DB = drizzle({ schema: appSchema, client: sqlite });

const gtfsSqlite = new Database(config.gtfsDbFilePath!);
gtfsSqlite.pragma('journal_mode = WAL');
const gtfsDB = drizzle({ client: gtfsSqlite });

export { DB, gtfsDB };