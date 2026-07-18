import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as appSchema from '../db/schema';

const config = useRuntimeConfig();

const sqlite = new Database(config.dbFileName!);
sqlite.pragma('journal_mode = WAL');
// foreign_keys is a per-connection pragma; set it explicitly so onDelete
// cascades in the schema are enforced regardless of the driver/build defaults.
sqlite.pragma('foreign_keys = ON');
const DB = drizzle({ schema: appSchema, client: sqlite });

const gtfsSqlite = new Database(config.gtfsDbFilePath!);
gtfsSqlite.pragma('journal_mode = WAL');
gtfsSqlite.pragma('foreign_keys = ON');
// The GTFS DB is large (~1GB) and read-heavy; give it a bigger page cache and
// memory-mapped reads to cut query latency.
gtfsSqlite.pragma('cache_size = -65536');   // 64 MiB page cache (negative value = KiB)
gtfsSqlite.pragma('mmap_size = 268435456'); // 256 MiB memory-mapped I/O
const gtfsDB = drizzle({ client: gtfsSqlite });

export { DB, gtfsDB };