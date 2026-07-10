import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// Minimal DDL covering only the columns the map-feature queries touch.
// Column names match db/gtfs-migrations/schema.ts so drizzle queries resolve.
const DDL = `
  CREATE TABLE routes (
    route_id TEXT PRIMARY KEY, agency_id TEXT, route_short_name TEXT,
    route_long_name TEXT, route_desc TEXT, route_type INTEGER,
    route_url TEXT, route_color TEXT, route_text_color TEXT,
    route_sort_order INTEGER, continuous_pickup INTEGER, continuous_drop_off INTEGER,
    network_id TEXT
  );
  CREATE TABLE trips (
    trip_id TEXT PRIMARY KEY, route_id TEXT, service_id TEXT,
    shape_id TEXT, direction_id INTEGER
  );
  CREATE TABLE shapes (
    shape_id TEXT, shape_pt_lat REAL, shape_pt_lon REAL, shape_pt_sequence INTEGER,
    PRIMARY KEY (shape_id, shape_pt_sequence)
  );
  CREATE TABLE stops (
    stop_id TEXT PRIMARY KEY, stop_name TEXT, stop_lat REAL, stop_lon REAL
  );
`;

export function createGtfsFixture(): { db: BetterSQLite3Database; sqlite: DatabaseType } {
  const sqlite = new Database(':memory:');
  sqlite.exec(DDL);
  return { db: drizzle({ client: sqlite }), sqlite };
}

export function seedRoute(
  sqlite: DatabaseType,
  route: {
    routeId: string;
    agencyId?: string | null;
    routeShortName?: string | null;
    routeLongName?: string | null;
    routeColor?: string | null;
    routeTextColor?: string | null;
  },
) {
  sqlite
    .prepare(
      `INSERT INTO routes
       (route_id, agency_id, route_short_name, route_long_name, route_type, route_color, route_text_color)
       VALUES (?, ?, ?, ?, 3, ?, ?)`,
    )
    .run(
      route.routeId,
      route.agencyId ?? null,
      route.routeShortName ?? null,
      route.routeLongName ?? null,
      route.routeColor ?? null,
      route.routeTextColor ?? null,
    );
}

export function seedTrip(sqlite: DatabaseType, tripId: string, routeId: string, shapeId: string | null) {
  sqlite
    .prepare(`INSERT INTO trips (trip_id, route_id, service_id, shape_id) VALUES (?, ?, 'SVC', ?)`)
    .run(tripId, routeId, shapeId);
}

export function seedShape(sqlite: DatabaseType, shapeId: string, points: [number, number][]) {
  const stmt = sqlite.prepare(
    `INSERT INTO shapes (shape_id, shape_pt_lon, shape_pt_lat, shape_pt_sequence) VALUES (?, ?, ?, ?)`,
  );
  points.forEach(([lon, lat], i) => stmt.run(shapeId, lon, lat, i));
}

export function seedStop(sqlite: DatabaseType, stopId: string, name: string, lon: number, lat: number) {
  sqlite
    .prepare(`INSERT INTO stops (stop_id, stop_name, stop_lon, stop_lat) VALUES (?, ?, ?, ?)`)
    .run(stopId, name, lon, lat);
}
