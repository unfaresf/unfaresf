import { importGtfs } from 'gtfs';
import Database from 'better-sqlite3';
import { readFile } from 'fs/promises';
import { join } from 'node:path';

// get the node-gtfs config file
const staticConfig = JSON.parse(
  await readFile(join(import.meta.dirname, 'gtfs-config.json'), 'utf-8')
);

// setup new database connection
const db = new Database(staticConfig.sqlitePath);
const config = {
  ...staticConfig,
  db
}

// import gtfs files into sqlite DB
// ----------------------------------------------------
//
await importGtfs(config);

// Create extra indexes on GTFS tables
// ----------------------------------------------------
//
console.log(`create unfaresf indexes`);
// create index statements that are used by unfareSF, mostly in joins.
const createIdxStatementStrings = [
  'CREATE INDEX IF NOT EXISTS idx_agency_agency_id ON agency(agency_id)',
  'CREATE INDEX IF NOT EXISTS idx_directions_route_id ON directions(route_id)',
  'CREATE INDEX IF NOT EXISTS idx_routes_agency_id ON routes(agency_id)',
  'CREATE INDEX IF NOT EXISTS idx_routes_route_id ON routes(route_id)',
  'CREATE INDEX IF NOT EXISTS idx_trips_trip_id ON trips(trip_id)',
  'CREATE INDEX IF NOT EXISTS idx_stops_stop_name ON stops(stop_name)',
];
// prepare create index statements. This checks to make sure they can be used
const createIdxStatements = createIdxStatementStrings.map(statementStr => {
  return db.prepare(statementStr);
}).filter(s => s);
// run prepared create index statements. This actually creates the indexes
createIdxStatements.forEach(preparedStatement => {
  preparedStatement.run();
});


// // Create FTS table and triggers for routes
// // ----------------------------------------------------
// //
// console.log(`Create FTS table`);
// // create full text search virtual table statements
// const createFTSStatementStrings = [
//   `CREATE VIRTUAL TABLE IF NOT EXISTS routes_fts using fts5(route_short_name, route_long_name);`,
//   `CREATE TRIGGER routes_ai AFTER INSERT ON routes BEGIN
//     INSERT INTO routes_fts(rowid, route_short_name, route_long_name) VALUES (new.route_id, new.route_short_name, new.route_long_name);
//   END;`,
//   `CREATE TRIGGER routes_ad AFTER DELETE ON routes BEGIN
//     INSERT INTO routes_fts(routes_fts, rowid, b, c) VALUES('delete', old.route_id, old.route_short_name, old.route_long_name);
//   END;`,
//   `CREATE TRIGGER routes_au AFTER UPDATE ON routes BEGIN
//     INSERT INTO routes_fts(routes_fts, rowid, b, c) VALUES('delete', old.route_id, old.route_short_name, old.route_long_name);
//     INSERT INTO routes_fts(rowid, route_short_name, route_long_name) VALUES (new.route_id, new.route_short_name, new.route_long_name);
//   END;`,
// ];
// // prepare create full text search virtual table statements
// const createFTSStatements = createFTSStatementStrings.map(statementStr => {
//   return db.prepare(statementStr);
// }).filter(s => s);
// // run the creating full text search statements.
// createFTSStatements.forEach(preparedStatement => {
//   preparedStatement.run();
// });

// // Insert GTFS routes data into FTS table
// // ----------------------------------------------------
// //
// console.log(`Insert data into FTS table`);
// const insertFTSStatementStrings = [
//   `INSERT INTO routes_fts SELECT routes.route_short_name, coalesce(routes.route_long_name, '') FROM routes`
// ];

// const insertFTSStatements = insertFTSStatementStrings.map(statementStr => {
//   try {
//     return db.prepare(statementStr);
//   } catch (err) {
//     if (!err.message.includes('already exists')) {
//       throw err;
//     }
//   }
// }).filter(s => s);

// insertFTSStatements.forEach(preparedStatement => {
//   const result = preparedStatement.run();
//   console.log("backfill result: ", result);
// });
console.log('Done.');