import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as appSchema from '../db/schema';

const config = useRuntimeConfig();

const sqlite = new Database(config.dbFileName!);
const DB = drizzle({ schema: appSchema, client: sqlite });

const gtfsSqlite = new Database(config.gtfsDbFilePath!);
const gtfsDB = drizzle({ client: gtfsSqlite });

export { DB, gtfsDB };