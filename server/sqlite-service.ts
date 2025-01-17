import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const config = useRuntimeConfig();

const sqlite = new Database(config.dbFileName!);
const DB = drizzle({ client: sqlite });

const gtfsSqlite = new Database(config.gtfsDbFilePath!);
const gtfsDB = drizzle({ client: gtfsSqlite });

export { DB, gtfsDB };