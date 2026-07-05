import { eq, and, inArray, isNotNull, asc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Feature, MultiLineString, Point } from 'geojson';
import { gtfsDB } from '../sqlite-service';
import { routes, trips, shapes, stops } from '../../db/gtfs-migrations/schema';
import type { RouteMeta, ShapePointRow, StopRow } from './route-geometry';
import { buildRouteFeature, buildStopFeature } from './route-geometry';

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
