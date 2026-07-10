# On-demand GeoJSON Route & Stop Rendering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the client-side-filtered vector-tile map sources with on-demand, cached per-route and per-stop GeoJSON served from the nuxt app's embedded GTFS DB, so the map fetches only what it renders.

**Architecture:** New nuxt server endpoints build a `MultiLineString` per route (union of its distinct trip shapes) and a `Point` per stop from the already-open GTFS SQLite DB, cached in-process and via HTTP headers. A client composable fetches only the ids currently displayed and feeds a MapLibre GeoJSON source; the existing map layers/filters/labels are unchanged. A DB-backed `sourceMode` flag selects tiles vs geojson so the vector-tile path is a zero-redeploy rollback.

**Tech Stack:** Nuxt 3 / Nitro server routes, drizzle-orm + better-sqlite3, `@turf/turf`, `@indoorequal/vue-maplibre-gl` (v8), zod, vitest (`@nuxt/test-utils`).

## Global Constraints

- gtfs-to-tiles, tippecanoe, tileserver-gl, and the vector-tile URLs are **not modified** — they remain the rollback path.
- `sourceMode` defaults to `'tiles'`; behavior is unchanged until a map integration explicitly sets `'geojson'`.
- Endpoints are **per-resource** (one route / one stop per request). No batched `?ids=` endpoints.
- A route's geometry is a single `MultiLineString` of the route's **distinct** shape geometries — not a true geometric merge.
- New endpoints reuse the existing patterns: `authorize(event, getGtfs)` and zod-validated router params, matching `server/api/gtfs/*`.
- Node 22. Run tests with: `npx vitest --config ./test/test.config.ts run <file>`.
- The GTFS test DB (`db/data/gtfs-test.db`) is empty, so DB-backed logic is tested against an in-memory fixture (Task 2), and pure geometry logic is tested with no DB (Task 1).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `server/utils/route-geometry.ts` (create) | Pure, DB-free builders: rows → GeoJSON `Feature`. Shared types. |
| `server/utils/gtfs-map-features.ts` (create) | drizzle queries against the GTFS DB + in-process cache + orchestrators. |
| `server/api/gtfs/map/routes/[routeId].get.ts` (create) | Route endpoint. |
| `server/api/gtfs/map/stops/[stopId].get.ts` (create) | Stop endpoint. |
| `server/utils/routes-cache.ts` (modify) | Refactor bbox onto the shared shape query (removes the duplication/order bug). |
| `db/schema.ts` (modify) | Add `sourceMode` to `mapIntegrationOptionSchema`. |
| `composable/useMapFeatures.ts` (create) | Client fetch/cache/merge of only-displayed features. |
| `components/routes-map.client.vue` (modify) | Conditional tile vs geojson source. |
| `test/gtfs-fixture.ts` (create) | In-memory GTFS sqlite fixture + seed helpers for tests. |

---

## Task 1: Pure GeoJSON builders

**Files:**
- Create: `server/utils/route-geometry.ts`
- Test: `server/utils/route-geometry.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `interface RouteMeta { routeId: string; agencyId: string | null; routeShortName: string | null; routeLongName: string | null; routeColor: string | null; routeTextColor: string | null }`
  - `interface ShapePointRow { shapeId: string; lon: number; lat: number }`
  - `interface StopRow { stopId: string; stopName: string | null; lon: number; lat: number }`
  - `buildRouteFeature(meta: RouteMeta, points: ShapePointRow[]): Feature<MultiLineString> | null`
  - `buildStopFeature(stop: StopRow): Feature<Point>`

- [ ] **Step 1: Write the failing test**

Create `server/utils/route-geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildRouteFeature,
  buildStopFeature,
  type RouteMeta,
  type ShapePointRow,
} from './route-geometry';

const meta: RouteMeta = {
  routeId: 'R1',
  agencyId: 'AG',
  routeShortName: '38',
  routeLongName: 'Geary',
  routeColor: 'ff0000',
  routeTextColor: 'ffffff',
};

describe('buildRouteFeature', () => {
  it('groups points into one line per shape, preserving order', () => {
    const points: ShapePointRow[] = [
      { shapeId: 'S1', lon: -122.1, lat: 37.1 },
      { shapeId: 'S1', lon: -122.2, lat: 37.2 },
      { shapeId: 'S2', lon: -122.3, lat: 37.3 },
      { shapeId: 'S2', lon: -122.4, lat: 37.4 },
    ];
    const feature = buildRouteFeature(meta, points);
    expect(feature).not.toBeNull();
    expect(feature!.geometry.type).toBe('MultiLineString');
    expect(feature!.geometry.coordinates).toEqual([
      [[-122.1, 37.1], [-122.2, 37.2]],
      [[-122.3, 37.3], [-122.4, 37.4]],
    ]);
    expect(feature!.id).toBe('R1');
    expect(feature!.properties).toMatchObject({
      route_id: 'R1',
      route_short_name: '38',
      route_long_name: 'Geary',
      route_color: 'ff0000',
      route_text_color: 'ffffff',
      agency_id: 'AG',
    });
  });

  it('returns null when there are no points', () => {
    expect(buildRouteFeature(meta, [])).toBeNull();
  });

  it('drops shapes with fewer than 2 points', () => {
    const points: ShapePointRow[] = [
      { shapeId: 'S1', lon: -122.1, lat: 37.1 },
      { shapeId: 'S2', lon: -122.3, lat: 37.3 },
      { shapeId: 'S2', lon: -122.4, lat: 37.4 },
    ];
    const feature = buildRouteFeature(meta, points);
    expect(feature!.geometry.coordinates).toEqual([
      [[-122.3, 37.3], [-122.4, 37.4]],
    ]);
  });
});

describe('buildStopFeature', () => {
  it('builds a Point feature with stop properties', () => {
    const feature = buildStopFeature({ stopId: 'ST1', stopName: 'Main & 1st', lon: -122.5, lat: 37.5 });
    expect(feature.geometry).toEqual({ type: 'Point', coordinates: [-122.5, 37.5] });
    expect(feature.id).toBe('ST1');
    expect(feature.properties).toEqual({ stop_id: 'ST1', stop_name: 'Main & 1st' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config ./test/test.config.ts run server/utils/route-geometry.test.ts`
Expected: FAIL — cannot resolve `./route-geometry`.

- [ ] **Step 3: Write minimal implementation**

Create `server/utils/route-geometry.ts`:

```ts
import type { Feature, MultiLineString, Point } from 'geojson';

export interface RouteMeta {
  routeId: string;
  agencyId: string | null;
  routeShortName: string | null;
  routeLongName: string | null;
  routeColor: string | null;
  routeTextColor: string | null;
}

export interface ShapePointRow {
  shapeId: string;
  lon: number;
  lat: number;
}

export interface StopRow {
  stopId: string;
  stopName: string | null;
  lon: number;
  lat: number;
}

// `points` must arrive grouped/ordered by (shapeId, shape_pt_sequence).
export function buildRouteFeature(
  meta: RouteMeta,
  points: ShapePointRow[],
): Feature<MultiLineString> | null {
  if (points.length === 0) return null;

  const lines = new Map<string, [number, number][]>();
  for (const p of points) {
    let line = lines.get(p.shapeId);
    if (!line) {
      line = [];
      lines.set(p.shapeId, line);
    }
    line.push([p.lon, p.lat]);
  }

  // A valid GeoJSON LineString needs at least two positions.
  const coordinates = [...lines.values()].filter((line) => line.length >= 2);
  if (coordinates.length === 0) return null;

  return {
    type: 'Feature',
    id: meta.routeId,
    geometry: { type: 'MultiLineString', coordinates },
    properties: {
      route_id: meta.routeId,
      route_short_name: meta.routeShortName,
      route_long_name: meta.routeLongName,
      route_color: meta.routeColor,
      route_text_color: meta.routeTextColor,
      agency_id: meta.agencyId,
    },
  };
}

export function buildStopFeature(stop: StopRow): Feature<Point> {
  return {
    type: 'Feature',
    id: stop.stopId,
    geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] },
    properties: {
      stop_id: stop.stopId,
      stop_name: stop.stopName,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest --config ./test/test.config.ts run server/utils/route-geometry.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/route-geometry.ts server/utils/route-geometry.test.ts
git commit -m "feat: pure GeoJSON builders for route/stop features"
```

---

## Task 2: GTFS query functions + test fixture

**Files:**
- Create: `server/utils/gtfs-map-features.ts` (query functions only in this task)
- Create: `test/gtfs-fixture.ts`
- Test: `server/utils/gtfs-map-features.test.ts`

**Interfaces:**
- Consumes: `RouteMeta`, `ShapePointRow`, `StopRow` from Task 1; drizzle table objects from `db/gtfs-migrations/schema`; `gtfsDB` from `server/sqlite-service`.
- Produces:
  - `fetchRouteMeta(routeId: string, db?: BetterSQLite3Database): Promise<RouteMeta | null>`
  - `fetchRouteShapePoints(routeId: string, db?: BetterSQLite3Database): Promise<ShapePointRow[]>`
  - `fetchStopRow(stopId: string, db?: BetterSQLite3Database): Promise<StopRow | null>`
  - `createGtfsFixture(): { db: BetterSQLite3Database; sqlite: DatabaseType }` plus `seedRoute`, `seedTrip`, `seedShape`, `seedStop`.

- [ ] **Step 1: Write the fixture helper**

Create `test/gtfs-fixture.ts`:

```ts
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// Minimal DDL covering only the columns the map-feature queries touch.
// Column names match db/gtfs-migrations/schema.ts so drizzle queries resolve.
const DDL = `
  CREATE TABLE routes (
    route_id TEXT PRIMARY KEY, agency_id TEXT, route_short_name TEXT,
    route_long_name TEXT, route_desc TEXT, route_type INTEGER,
    route_color TEXT, route_text_color TEXT
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
```

- [ ] **Step 2: Write the failing test**

Create `server/utils/gtfs-map-features.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  createGtfsFixture,
  seedRoute,
  seedTrip,
  seedShape,
  seedStop,
} from '../../test/gtfs-fixture';
import {
  fetchRouteMeta,
  fetchRouteShapePoints,
  fetchStopRow,
} from './gtfs-map-features';

describe('fetchRouteShapePoints', () => {
  it('returns distinct shapes for a route, ordered by shape then sequence', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R1', routeShortName: '38' });
    seedShape(sqlite, 'S1', [[-122.1, 37.1], [-122.2, 37.2]]);
    seedShape(sqlite, 'S2', [[-122.3, 37.3], [-122.4, 37.4]]);
    // Two trips share S1 — the shape's points must NOT be duplicated.
    seedTrip(sqlite, 'T1', 'R1', 'S1');
    seedTrip(sqlite, 'T2', 'R1', 'S1');
    seedTrip(sqlite, 'T3', 'R1', 'S2');

    const points = await fetchRouteShapePoints('R1', db);

    expect(points).toEqual([
      { shapeId: 'S1', lon: -122.1, lat: 37.1 },
      { shapeId: 'S1', lon: -122.2, lat: 37.2 },
      { shapeId: 'S2', lon: -122.3, lat: 37.3 },
      { shapeId: 'S2', lon: -122.4, lat: 37.4 },
    ]);
  });

  it('returns an empty array for an unknown route', async () => {
    const { db } = createGtfsFixture();
    expect(await fetchRouteShapePoints('NOPE', db)).toEqual([]);
  });
});

describe('fetchRouteMeta', () => {
  it('returns route metadata or null', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R1', agencyId: 'AG', routeShortName: '38', routeLongName: 'Geary' });

    expect(await fetchRouteMeta('R1', db)).toEqual({
      routeId: 'R1',
      agencyId: 'AG',
      routeShortName: '38',
      routeLongName: 'Geary',
      routeColor: null,
      routeTextColor: null,
    });
    expect(await fetchRouteMeta('NOPE', db)).toBeNull();
  });
});

describe('fetchStopRow', () => {
  it('returns a stop row or null', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedStop(sqlite, 'ST1', 'Main & 1st', -122.5, 37.5);

    expect(await fetchStopRow('ST1', db)).toEqual({
      stopId: 'ST1',
      stopName: 'Main & 1st',
      lon: -122.5,
      lat: 37.5,
    });
    expect(await fetchStopRow('NOPE', db)).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest --config ./test/test.config.ts run server/utils/gtfs-map-features.test.ts`
Expected: FAIL — cannot resolve `./gtfs-map-features`.

- [ ] **Step 4: Write minimal implementation**

Create `server/utils/gtfs-map-features.ts`:

```ts
import { eq, and, inArray, isNotNull, asc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { gtfsDB } from '../sqlite-service';
import { routes, trips, shapes, stops } from '../../db/gtfs-migrations/schema';
import type { RouteMeta, ShapePointRow, StopRow } from './route-geometry';

export async function fetchRouteMeta(
  routeId: string,
  db: BetterSQLite3Database = gtfsDB,
): Promise<RouteMeta | null> {
  const [row] = await db
    .select({
      routeId: routes.routeId,
      agencyId: routes.agencyId,
      routeShortName: routes.routeShortName,
      routeLongName: routes.routeLongName,
      routeColor: routes.routeColor,
      routeTextColor: routes.routeTextColor,
    })
    .from(routes)
    .where(eq(routes.routeId, routeId))
    .limit(1);
  return row ?? null;
}

export async function fetchRouteShapePoints(
  routeId: string,
  db: BetterSQLite3Database = gtfsDB,
): Promise<ShapePointRow[]> {
  // Distinct shapes used by the route's trips (dedup across trips sharing a shape).
  const shapeIdRows = await db
    .selectDistinct({ shapeId: trips.shapeId })
    .from(trips)
    .where(and(eq(trips.routeId, routeId), isNotNull(trips.shapeId)));

  const shapeIds = shapeIdRows
    .map((r) => r.shapeId)
    .filter((s): s is string => s !== null);
  if (shapeIds.length === 0) return [];

  // Deterministic ordering at the row level (no GROUP_CONCAT ordering ambiguity).
  return db
    .select({
      shapeId: shapes.shapeId,
      lon: shapes.shapePtLon,
      lat: shapes.shapePtLat,
    })
    .from(shapes)
    .where(
      and(
        inArray(shapes.shapeId, shapeIds),
        isNotNull(shapes.shapePtLat),
        isNotNull(shapes.shapePtLon),
      ),
    )
    .orderBy(asc(shapes.shapeId), asc(shapes.shapePtSequence));
}

export async function fetchStopRow(
  stopId: string,
  db: BetterSQLite3Database = gtfsDB,
): Promise<StopRow | null> {
  const [row] = await db
    .select({
      stopId: stops.stopId,
      stopName: stops.stopName,
      lon: stops.stopLon,
      lat: stops.stopLat,
    })
    .from(stops)
    .where(and(eq(stops.stopId, stopId), isNotNull(stops.stopLat), isNotNull(stops.stopLon)))
    .limit(1);
  return (row as StopRow) ?? null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest --config ./test/test.config.ts run server/utils/gtfs-map-features.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add server/utils/gtfs-map-features.ts server/utils/gtfs-map-features.test.ts test/gtfs-fixture.ts
git commit -m "feat: GTFS map-feature queries + in-memory test fixture"
```

---

## Task 3: Route endpoint + cached orchestrator

**Files:**
- Modify: `server/utils/gtfs-map-features.ts` (append `getRouteFeature`)
- Create: `server/api/gtfs/map/routes/[routeId].get.ts`
- Test: `server/utils/gtfs-map-features.test.ts` (append)

**Interfaces:**
- Consumes: `fetchRouteMeta`, `fetchRouteShapePoints` (Task 2), `buildRouteFeature` (Task 1), `getGtfs` from `shared/utils/abilities`.
- Produces: `getRouteFeature(routeId: string, db?: BetterSQLite3Database): Promise<Feature<MultiLineString> | null>`. Endpoint `GET /api/gtfs/map/routes/:routeId`.

- [ ] **Step 1: Write the failing test** (append to `server/utils/gtfs-map-features.test.ts`)

```ts
import { getRouteFeature } from './gtfs-map-features';

describe('getRouteFeature', () => {
  it('builds a MultiLineString feature for a route', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R1', routeShortName: '38', routeColor: 'ff0000' });
    seedShape(sqlite, 'S1', [[-122.1, 37.1], [-122.2, 37.2]]);
    seedTrip(sqlite, 'T1', 'R1', 'S1');

    const feature = await getRouteFeature('R1', db);
    expect(feature!.geometry.type).toBe('MultiLineString');
    expect(feature!.geometry.coordinates).toEqual([[[-122.1, 37.1], [-122.2, 37.2]]]);
    expect(feature!.properties!.route_id).toBe('R1');
  });

  it('returns null for an unknown route', async () => {
    const { db } = createGtfsFixture();
    expect(await getRouteFeature('NOPE', db)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config ./test/test.config.ts run server/utils/gtfs-map-features.test.ts`
Expected: FAIL — `getRouteFeature` is not exported.

- [ ] **Step 3: Write minimal implementation** (append to `server/utils/gtfs-map-features.ts`)

Add these imports to the top of the file:

```ts
import type { Feature, MultiLineString } from 'geojson';
import { buildRouteFeature } from './route-geometry';
```

Append:

```ts
// Geometry is static per GTFS feed version; a deploy restarts the process and
// clears this. Only cache when using the default (production) DB.
const routeFeatureCache = new Map<string, Feature<MultiLineString> | null>();

export async function getRouteFeature(
  routeId: string,
  db: BetterSQLite3Database = gtfsDB,
): Promise<Feature<MultiLineString> | null> {
  const useCache = db === gtfsDB;
  if (useCache && routeFeatureCache.has(routeId)) {
    return routeFeatureCache.get(routeId)!;
  }

  const [meta, points] = await Promise.all([
    fetchRouteMeta(routeId, db),
    fetchRouteShapePoints(routeId, db),
  ]);
  const feature = meta ? buildRouteFeature(meta, points) : null;

  if (useCache) routeFeatureCache.set(routeId, feature);
  return feature;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest --config ./test/test.config.ts run server/utils/gtfs-map-features.test.ts`
Expected: PASS (6 tests total in file).

- [ ] **Step 5: Create the endpoint**

Create `server/api/gtfs/map/routes/[routeId].get.ts`:

```ts
import { z } from 'zod';
import { unescape } from 'node:querystring';
import { getGtfs } from '../../../../../shared/utils/abilities';
import { getRouteFeature } from '../../../../utils/gtfs-map-features';

const paramsSchema = z.object({
  routeId: z.string().trim().min(1).max(64).transform(unescape),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  const { routeId } = await getValidatedRouterParams(event, paramsSchema.parse);

  let feature;
  try {
    feature = await getRouteFeature(routeId);
  } catch (err: any) {
    throw createError({ statusCode: 500 });
  }

  if (!feature) {
    throw createError({ statusCode: 404, statusMessage: 'Route not found' });
  }

  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  return feature;
});
```

- [ ] **Step 6: Verify the endpoint typechecks and the suite is green**

Run: `npx vitest --config ./test/test.config.ts run server/utils/gtfs-map-features.test.ts`
Expected: PASS.
Run: `npx nuxi typecheck` (or `npm run tsc`)
Expected: no new type errors in the created files.

- [ ] **Step 7: Commit**

```bash
git add server/utils/gtfs-map-features.ts server/utils/gtfs-map-features.test.ts server/api/gtfs/map/routes/
git commit -m "feat: GET /api/gtfs/map/routes/:routeId returns route GeoJSON"
```

---

## Task 4: Stop endpoint + cached orchestrator

**Files:**
- Modify: `server/utils/gtfs-map-features.ts` (append `getStopFeature`)
- Create: `server/api/gtfs/map/stops/[stopId].get.ts`
- Test: `server/utils/gtfs-map-features.test.ts` (append)

**Interfaces:**
- Consumes: `fetchStopRow` (Task 2), `buildStopFeature` (Task 1).
- Produces: `getStopFeature(stopId: string, db?: BetterSQLite3Database): Promise<Feature<Point> | null>`. Endpoint `GET /api/gtfs/map/stops/:stopId`.

- [ ] **Step 1: Write the failing test** (append to `server/utils/gtfs-map-features.test.ts`)

```ts
import { getStopFeature } from './gtfs-map-features';

describe('getStopFeature', () => {
  it('builds a Point feature for a stop', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedStop(sqlite, 'ST1', 'Main & 1st', -122.5, 37.5);

    const feature = await getStopFeature('ST1', db);
    expect(feature!.geometry).toEqual({ type: 'Point', coordinates: [-122.5, 37.5] });
    expect(feature!.properties!.stop_id).toBe('ST1');
  });

  it('returns null for an unknown stop', async () => {
    const { db } = createGtfsFixture();
    expect(await getStopFeature('NOPE', db)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config ./test/test.config.ts run server/utils/gtfs-map-features.test.ts`
Expected: FAIL — `getStopFeature` is not exported.

- [ ] **Step 3: Write minimal implementation** (append to `server/utils/gtfs-map-features.ts`)

Add to the geojson-type import at the top: change `import type { Feature, MultiLineString } from 'geojson';` to:

```ts
import type { Feature, MultiLineString, Point } from 'geojson';
```

Add to the route-geometry import: change to:

```ts
import { buildRouteFeature, buildStopFeature } from './route-geometry';
```

Append:

```ts
const stopFeatureCache = new Map<string, Feature<Point> | null>();

export async function getStopFeature(
  stopId: string,
  db: BetterSQLite3Database = gtfsDB,
): Promise<Feature<Point> | null> {
  const useCache = db === gtfsDB;
  if (useCache && stopFeatureCache.has(stopId)) {
    return stopFeatureCache.get(stopId)!;
  }

  const row = await fetchStopRow(stopId, db);
  const feature = row ? buildStopFeature(row) : null;

  if (useCache) stopFeatureCache.set(stopId, feature);
  return feature;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest --config ./test/test.config.ts run server/utils/gtfs-map-features.test.ts`
Expected: PASS (8 tests total in file).

- [ ] **Step 5: Create the endpoint**

Create `server/api/gtfs/map/stops/[stopId].get.ts`:

```ts
import { z } from 'zod';
import { unescape } from 'node:querystring';
import { getGtfs } from '../../../../../shared/utils/abilities';
import { getStopFeature } from '../../../../utils/gtfs-map-features';

const paramsSchema = z.object({
  stopId: z.string().trim().min(1).max(64).transform(unescape),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  const { stopId } = await getValidatedRouterParams(event, paramsSchema.parse);

  let feature;
  try {
    feature = await getStopFeature(stopId);
  } catch (err: any) {
    throw createError({ statusCode: 500 });
  }

  if (!feature) {
    throw createError({ statusCode: 404, statusMessage: 'Stop not found' });
  }

  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  return feature;
});
```

- [ ] **Step 6: Commit**

```bash
git add server/utils/gtfs-map-features.ts server/utils/gtfs-map-features.test.ts server/api/gtfs/map/stops/
git commit -m "feat: GET /api/gtfs/map/stops/:stopId returns stop GeoJSON"
```

---

## Task 5: Refactor bbox onto the shared shape query

Removes the duplicate/misordered geometry in `routes-cache.ts` and routes its bbox through the same corrected query, so the bbox and the rendered geometry cannot drift. Return shape of `getRouteTrips` is preserved exactly (`{ ...routeRow, bbox }`) so `broadcasts/geo.get.ts` and `routes/[id].get.ts` are unaffected.

**Files:**
- Modify: `server/utils/routes-cache.ts`
- Test: `server/utils/routes-cache.test.ts` (create)

**Interfaces:**
- Consumes: `fetchRouteShapePoints` (Task 2), `buildRouteFeature` (Task 1), `bbox` from `@turf/turf`.
- Produces: `getRouteTrips(id: string, db?: BetterSQLite3Database): Promise<Record<string, unknown> & { bbox: [number, number, number, number] }>` (unchanged callers; adds optional injectable `db`).

- [ ] **Step 1: Write the failing test**

Create `server/utils/routes-cache.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bbox } from '@turf/turf';
import { lineString } from '@turf/turf';
import {
  createGtfsFixture,
  seedRoute,
  seedTrip,
  seedShape,
} from '../../test/gtfs-fixture';
import { getRouteTrips } from './routes-cache';

describe('getRouteTrips', () => {
  it('returns the route row with a bbox computed from its shapes', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R1', routeShortName: '38' });
    seedShape(sqlite, 'S1', [[-122.1, 37.1], [-122.2, 37.2]]);
    seedTrip(sqlite, 'T1', 'R1', 'S1');

    const result = await getRouteTrips('R1', db);

    expect(result.routeId).toBe('R1');
    const expected = bbox(lineString([[-122.1, 37.1], [-122.2, 37.2]]));
    expect(result.bbox).toEqual(expected);
  });

  it('falls back to the default bbox when a route has no shapes', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R2', routeShortName: 'X' });

    const result = await getRouteTrips('R2', db);
    expect(result.bbox).toEqual([180, 90, -180, -90]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config ./test/test.config.ts run server/utils/routes-cache.test.ts`
Expected: FAIL — `getRouteTrips` does not accept a second arg / bbox mismatch (old code path).

- [ ] **Step 3: Rewrite `routes-cache.ts`**

Replace the entire contents of `server/utils/routes-cache.ts` with:

```ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { gtfsDB } from '../sqlite-service';
import { routes } from '../../db/gtfs-migrations/schema';
import { eq } from 'drizzle-orm';
import { bbox } from '@turf/turf';
import { fetchRouteShapePoints } from './gtfs-map-features';
import { buildRouteFeature } from './route-geometry';

const DEFAULT_BBOX: [number, number, number, number] = [180, 90, -180, -90];

async function getRoute(id: string, db: BetterSQLite3Database = gtfsDB) {
  const [route] = await db.select().from(routes).where(eq(routes.routeId, id)).limit(1);
  return route;
}

export async function getRouteTrips(id: string, db: BetterSQLite3Database = gtfsDB) {
  const [route, points] = await Promise.all([
    getRoute(id, db),
    fetchRouteShapePoints(id, db),
  ]);

  const feature = route
    ? buildRouteFeature(
        {
          routeId: route.routeId,
          agencyId: route.agencyId,
          routeShortName: route.routeShortName,
          routeLongName: route.routeLongName,
          routeColor: route.routeColor,
          routeTextColor: route.routeTextColor,
        },
        points,
      )
    : null;

  const box = feature
    ? (bbox(feature) as [number, number, number, number])
    : DEFAULT_BBOX;

  return { ...route, bbox: box };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest --config ./test/test.config.ts run server/utils/routes-cache.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify existing consumers still typecheck**

The consumers `server/api/gtfs/routes/[id].get.ts` and `server/api/broadcasts/geo.get.ts` call `getRouteTrips(id)` and read `.bbox` / `.routeId` — unchanged. Confirm:

Run: `npx nuxi typecheck`
Expected: no new errors in `routes-cache.ts` or its consumers.

- [ ] **Step 6: Commit**

```bash
git add server/utils/routes-cache.ts server/utils/routes-cache.test.ts
git commit -m "refactor: compute route bbox from shared shape query (fixes dup/order)"
```

---

## Task 6: Add the `sourceMode` feature flag

**Files:**
- Modify: `db/schema.ts` (`mapIntegrationOptionSchema`, ~line 161)
- Test: `db/schema.test.ts` (create)

**Interfaces:**
- Produces: `MapOptions.sourceMode: 'tiles' | 'geojson'` (defaults to `'tiles'` when absent).

- [ ] **Step 1: Write the failing test**

Create `db/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapIntegrationOptionSchema } from './schema';

describe('mapIntegrationOptionSchema.sourceMode', () => {
  it('defaults to tiles when omitted', () => {
    const parsed = mapIntegrationOptionSchema.parse({ type: 'map' });
    expect(parsed.sourceMode).toBe('tiles');
  });

  it('accepts geojson', () => {
    const parsed = mapIntegrationOptionSchema.parse({ type: 'map', sourceMode: 'geojson' });
    expect(parsed.sourceMode).toBe('geojson');
  });

  it('rejects unknown values', () => {
    expect(() => mapIntegrationOptionSchema.parse({ type: 'map', sourceMode: 'nope' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config ./test/test.config.ts run db/schema.test.ts`
Expected: FAIL — `parsed.sourceMode` is `undefined`.

- [ ] **Step 3: Add the field**

In `db/schema.ts`, edit `mapIntegrationOptionSchema` to add `sourceMode`:

```ts
export const mapIntegrationOptionSchema = z.object({
  type: z.literal("map"),
  mapStylesUrl: z.string().url().optional(),
  tileServerDomain: z.string().url().optional(),
  center: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  zoom: z.number().min(0).max(24).optional(),
  sourceMode: z.enum(["tiles", "geojson"]).default("tiles"),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest --config ./test/test.config.ts run db/schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/schema.test.ts
git commit -m "feat: add sourceMode flag (tiles|geojson) to map integration options"
```

---

## Task 7: `useMapFeatures` composable

Fetches only the currently-displayed route/stop ids, caches each id, and exposes reactive FeatureCollections for the GeoJSON sources. A `fetcher` param is injectable so the logic is unit-testable without Nuxt's `$fetch`.

**Files:**
- Create: `composable/useMapFeatures.ts`
- Test: `composable/useMapFeatures.test.ts`

**Interfaces:**
- Produces:
  - `useMapFeatures(params: { routeIds: Ref<string[]>; stopIds: Ref<string[]>; fetcher?: (url: string) => Promise<Feature> }): { routesData: Ref<FeatureCollection>; stopsData: Ref<FeatureCollection> }`

- [ ] **Step 1: Write the failing test**

Create `composable/useMapFeatures.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import type { Feature } from 'geojson';
import { useMapFeatures } from './useMapFeatures';

const flush = async () => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};

function routeFeature(id: string): Feature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] },
    properties: { route_id: id },
  };
}

describe('useMapFeatures', () => {
  it('fetches and collects only the requested route ids', async () => {
    const fetcher = vi.fn(async (url: string) => routeFeature(url.split('/').pop()!));
    const routeIds = ref<string[]>(['R1', 'R2']);
    const stopIds = ref<string[]>([]);

    const { routesData } = useMapFeatures({ routeIds, stopIds, fetcher });
    await flush();

    expect(routesData.value.features.map((f) => f.id)).toEqual(['R1', 'R2']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('caches ids and only fetches new ones on change', async () => {
    const fetcher = vi.fn(async (url: string) => routeFeature(url.split('/').pop()!));
    const routeIds = ref<string[]>(['R1']);
    const stopIds = ref<string[]>([]);

    const { routesData } = useMapFeatures({ routeIds, stopIds, fetcher });
    await flush();

    routeIds.value = ['R1', 'R2'];
    await flush();

    expect(routesData.value.features.map((f) => f.id)).toEqual(['R1', 'R2']);
    expect(fetcher).toHaveBeenCalledTimes(2); // R1 not refetched
  });

  it('skips ids whose fetch fails (e.g. 404)', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('R2')) throw new Error('404');
      return routeFeature(url.split('/').pop()!);
    });
    const routeIds = ref<string[]>(['R1', 'R2']);
    const stopIds = ref<string[]>([]);

    const { routesData } = useMapFeatures({ routeIds, stopIds, fetcher });
    await flush();

    expect(routesData.value.features.map((f) => f.id)).toEqual(['R1']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config ./test/test.config.ts run composable/useMapFeatures.test.ts`
Expected: FAIL — cannot resolve `./useMapFeatures`.

- [ ] **Step 3: Write minimal implementation**

Create `composable/useMapFeatures.ts`:

```ts
import { ref, watch, type Ref } from 'vue';
import type { Feature, FeatureCollection } from 'geojson';

type Fetcher = (url: string) => Promise<Feature>;

function emptyCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

export function useMapFeatures(params: {
  routeIds: Ref<string[]>;
  stopIds: Ref<string[]>;
  fetcher?: Fetcher;
}): { routesData: Ref<FeatureCollection>; stopsData: Ref<FeatureCollection> } {
  // `$fetch` is a Nuxt auto-import available at runtime; tests inject `fetcher`.
  const fetcher: Fetcher = params.fetcher ?? ((url) => $fetch<Feature>(url));

  const routeCache = new Map<string, Feature | null>();
  const stopCache = new Map<string, Feature | null>();
  const routesData = ref<FeatureCollection>(emptyCollection());
  const stopsData = ref<FeatureCollection>(emptyCollection());

  async function ensure(ids: string[], cache: Map<string, Feature | null>, urlFor: (id: string) => string) {
    const missing = ids.filter((id) => !cache.has(id));
    await Promise.all(
      missing.map(async (id) => {
        try {
          cache.set(id, await fetcher(urlFor(id)));
        } catch {
          cache.set(id, null); // unknown/404 — remember so we don't refetch
        }
      }),
    );
  }

  function collect(ids: string[], cache: Map<string, Feature | null>): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: ids.map((id) => cache.get(id)).filter((f): f is Feature => !!f),
    };
  }

  async function syncRoutes(ids: string[]) {
    await ensure(ids, routeCache, (id) => `/api/gtfs/map/routes/${encodeURIComponent(id)}`);
    routesData.value = collect(ids, routeCache);
  }

  async function syncStops(ids: string[]) {
    await ensure(ids, stopCache, (id) => `/api/gtfs/map/stops/${encodeURIComponent(id)}`);
    stopsData.value = collect(ids, stopCache);
  }

  watch(params.routeIds, (ids) => { void syncRoutes(ids); }, { immediate: true, deep: true });
  watch(params.stopIds, (ids) => { void syncStops(ids); }, { immediate: true, deep: true });

  return { routesData, stopsData };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest --config ./test/test.config.ts run composable/useMapFeatures.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add composable/useMapFeatures.ts composable/useMapFeatures.test.ts
git commit -m "feat: useMapFeatures composable fetches only displayed features"
```

---

## Task 8: Wire the GeoJSON source into the map component

Adds a GeoJSON code path alongside the existing vector-tile path, selected by `sourceMode`. Layer paints, filters, and labels are identical in both branches; only the source component and `source-layer` differ (GeoJSON layers omit `source-layer`). Only one branch mounts at a time, so layer ids do not collide.

This component is `.client.vue` and is mocked in the test suite (`test/test.setup.ts`), so it is verified manually rather than with an automated test.

**Files:**
- Modify: `components/routes-map.client.vue`

**Interfaces:**
- Consumes: `useMapFeatures` (Task 7), `MglGeoJsonSource` from `@indoorequal/vue-maplibre-gl`, `MapOptions.sourceMode` (Task 6).

- [ ] **Step 1: Add imports and computed id-sets**

In the `<script setup>` block of `components/routes-map.client.vue`, add `MglGeoJsonSource` to the existing import from `@indoorequal/vue-maplibre-gl`:

```ts
import {
  MglMap,
  useMap,
  MglNavigationControl,
  MglVectorSource,
  MglGeoJsonSource,
  MglLineLayer,
  MglCircleLayer,
  MglGeolocateControl,
  MglSymbolLayer,
  MglAttributionControl,
} from "@indoorequal/vue-maplibre-gl";
```

After the existing `warmRouteIds` ref (around line 165), add the source-mode flag, the id-sets, and the composable:

```ts
const sourceMode = computed(() => props.config.sourceMode ?? "tiles");

const neededRouteIds = computed(() =>
  [
    props.route?.routeId,
    ...visibleRouteIds.value,
    ...warmRouteIds.value,
  ].filter((r): r is string => !!r)
);
const neededStopIds = computed(() =>
  [props.stopId, ...visibleStopIds.value].filter((s): s is string => !!s)
);

const { routesData, stopsData } = useMapFeatures({
  routeIds: neededRouteIds,
  stopIds: neededStopIds,
});
```

- [ ] **Step 2: Gate the existing vector sources on `sourceMode === 'tiles'`**

In the template, add `v-if="sourceMode === 'tiles'"` to the two existing `<MglVectorSource>` elements (the `source-id="stops"` block and the `source-id="trips"` block). Leave their children (layers) exactly as they are.

- [ ] **Step 3: Add the GeoJSON sources**

Immediately after the closing `</MglVectorSource>` of the trips block (still inside `<MglMap>`), add the GeoJSON variants. The layer `paint`/`filter`/`layout` bindings are the same constants used by the tile branch; only `source-layer` is dropped:

```html
      <template v-if="sourceMode === 'geojson'">
        <MglGeoJsonSource source-id="stops" :data="stopsData">
          <MglCircleLayer
            layer-id="hot-stops"
            :paint="hotStopsLayerCirclesPaint"
            :filter="hotStops"
            :minzoom="7"
          />
          <MglCircleLayer
            layer-id="transit-stops"
            :paint="stopsLayerCirclesPaint"
            :filter="stopFilter"
            :minzoom="10"
          />
        </MglGeoJsonSource>

        <MglGeoJsonSource source-id="trips" :data="routesData">
          <MglLineLayer layer-id="warm-trips" :paint="warmPaint" :filter="warmStops" />
          <MglLineLayer layer-id="hot-trips" :paint="hotPaint" :filter="hotTrips" />
          <MglLineLayer layer-id="transit-trips" :paint="paint" :filter="tripFilter" />
          <MglSymbolLayer
            layer-id="transit-trips-labels"
            :minzoom="6"
            :layout="routeSymbolLayout"
            :paint="routeSymbolPaint"
            :filter="routeLabels"
          />
        </MglGeoJsonSource>
      </template>
```

- [ ] **Step 4: Typecheck**

Run: `npx nuxi typecheck`
Expected: no new type errors in `components/routes-map.client.vue`.

- [ ] **Step 5: Manual verification (both paths)**

The GTFS DB must be present locally (`.env` `GTFS_DB_FILE_PATH`, e.g. `db/data/gtfs-green.db`). In the DB, set the `map` integration's `options.sourceMode` to `"geojson"` (via the settings UI or a direct DB update).

Run: `npm run dev`

Verify with the browser devtools Network tab:
- [ ] Selecting a route requests only `/api/gtfs/map/routes/<routeId>` (one small GeoJSON response), **not** `/data/trips/{z}/{x}/{y}.pbf` tiles.
- [ ] The selected route line renders with the same style as before, with its label.
- [ ] With recent broadcasts present, hot/warm routes and hot stops render (multiple `/api/gtfs/map/routes/...` and `/api/gtfs/map/stops/...` requests, each fetched once).
- [ ] Set `sourceMode` back to `"tiles"`, reload — the map loads vector tiles again and renders identically. (Rollback works.)

- [ ] **Step 6: Commit**

```bash
git add components/routes-map.client.vue
git commit -m "feat: render map from GeoJSON source when sourceMode=geojson"
```

---

## Final verification

- [ ] Run the full suite: `npm test`
  Expected: all tests pass, including the new `route-geometry`, `gtfs-map-features`, `routes-cache`, `schema`, and `useMapFeatures` tests.
- [ ] `npx nuxi typecheck` — no new errors.
- [ ] Confirm gtfs-to-tiles was not touched (`git -C /Users/andy/projects/gtfs-to-tiles status` clean of this work).

---

## Self-Review (completed)

**Spec coverage:**
- On-demand generation from embedded DB → Tasks 2–4. ✅
- Union = distinct shapes as MultiLineString → Task 1 + Task 2 (dedup query). ✅
- Correctness fix (dedup + deterministic order) → Task 2 query + Task 5 refactor onto same query. ✅
- Per-route and per-stop endpoints → Tasks 3, 4. ✅
- Caching (in-process + HTTP headers) → Tasks 3, 4. ✅
- Client source swap, layers unchanged → Task 8; fetch/cache/merge → Task 7. ✅
- Feature flag `sourceMode` default `tiles`, DB-backed rollback → Task 6 + Task 8. ✅
- Stops keyed by stop_id → Tasks 2, 4, 7. ✅
- Testing (pure unit + fixture integration + parity) → Tasks 1, 2, 5. ✅
- gtfs-to-tiles untouched → Global Constraints + final verification. ✅

**Type consistency:** `RouteMeta` / `ShapePointRow` / `StopRow` defined in Task 1 and consumed unchanged in Tasks 2–5. `getRouteFeature`/`getStopFeature`/`fetchRouteShapePoints` signatures are stable across tasks. `getRouteTrips` return shape preserved for existing consumers. Composable `useMapFeatures` signature matches its Task 8 call site (`{ routeIds, stopIds }` → `{ routesData, stopsData }`).

**Placeholder scan:** No TBD/TODO; every code and test step contains complete content.
