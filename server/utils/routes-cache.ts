import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { BBox } from 'geojson';
import { gtfsDB } from '../sqlite-service';
import { routes } from '../../db/gtfs-migrations/schema';
import { eq } from 'drizzle-orm';
import { bbox } from '@turf/turf';
import { fetchRouteShapePoints } from './gtfs-map-features';
import { buildRouteFeature } from './route-geometry';

const DEFAULT_BBOX: BBox = [180, 90, -180, -90];

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

  const box: BBox = feature ? bbox(feature) : DEFAULT_BBOX;

  return { ...route, bbox: box };
}
