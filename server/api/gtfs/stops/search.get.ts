import { getGtfs } from "../../../../shared/utils/abilities";
import { z } from "zod";
import { gtfsDB } from "../../../sqlite-service";
import {
  routes,
  stops,
  stopTimes,
  trips,
  directions,
  agency,
} from "../../../../db/gtfs-migrations/schema";
import { like, eq, lt, and, sql, type Subquery } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

const STOPS_RESULTS_LIMIT = 50;

const gtfsGetStopsQuerySchema = z.object({
  q: z.string().trim().max(32).optional(),
  agencyId: z.string().trim().nonempty().max(128),
  latitude: z.number({ coerce: true }).optional(),
  longitude: z.number({ coerce: true }).optional(),
});

async function getStops(
  agencyId: string,
  query: string | undefined,
  lat: number | undefined,
  lng: number | undefined
) {
  let subquery: SQLiteTable | Subquery = stops;
  if (null != lat && null != lng) {
    const maxDistance = 500; // 500 meters
    subquery = gtfsDB
      .select({
        stopId: stops.stopId,
        stopName: stops.stopName,
        stopLat: stops.stopLat,
        stopLon: stops.stopLon,
        distance: sql<number>`(
        6371000 * acos (
        cos ( radians(${lat}) )
        * cos( radians( stop_lat ) )
        * cos( radians( stop_lon ) - radians(${lng}) )
        + sin ( radians(${lat}) )
        * sin( radians( stop_lat ) )
        )
      )`,
      })
      .from(stops)
      .where(({ distance }) => lt(distance, maxDistance))
      .as("stops");
  }

  const queryTokens = query?.split(/\s+/) || [];
  return gtfsDB
    .selectDistinct({
      stopId: stops.stopId,
      stopName: stops.stopName,
      direction: directions.direction,
      directionId: directions.directionId,
    })
    .from(subquery)
    .innerJoin(stopTimes, eq(stopTimes.stopId, stops.stopId))
    .innerJoin(trips, eq(trips.tripId, stopTimes.tripId))
    .innerJoin(routes, eq(routes.routeId, trips.routeId))
    .innerJoin(agency, eq(routes.agencyId, agency.agencyId))
    .innerJoin(
      directions,
      and(
        eq(directions.directionId, trips.directionId),
        eq(routes.routeId, directions.routeId)
      )
    )
    .where(
      and(
        eq(agency.agencyId, agencyId),
        ...queryTokens.map((token) => like(stops.stopName, `%${token}%`))
      )
    )
    .orderBy(stops.stopName, directions.directionId)
    .limit(STOPS_RESULTS_LIMIT);
}

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);
  const { agencyId, q, latitude, longitude } = await getValidatedQuery(
    event,
    gtfsGetStopsQuerySchema.parse
  );
  try {
    return getStops(agencyId, q, latitude, longitude);
  } catch (err: any) {
    throw createError({
      statusCode: 500,
    });
  }
});
