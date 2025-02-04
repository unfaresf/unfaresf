import { getGtfs } from "../../../../shared/utils/abilities";
import { z } from "zod";
import { gtfsDB } from "../../../sqlite-service";
import { routes, stops, stopTimes, trips, directions } from "../../../../db/gtfs-migrations/schema";
import { like, eq, lt, and, sql } from "drizzle-orm";

const gtfsGetStopsQuerySchema = z.object({
  q: z.string().trim().max(32).optional(),
  routeId: z.string().trim().nonempty().max(128),
  direction: z.string().trim().nonempty().max(128).optional(),
  latitude: z.number({ coerce: true }).optional(),
  longitude: z.number({ coerce: true }).optional(),
  accuracy: z.number({ coerce: true }).optional(),
});

async function getStops(routeId:string, query:string|undefined) {
  return gtfsDB
    .selectDistinct({
      stopId: stops.stopId,
      stopName: stops.stopName,
      direction: directions.direction,
    })
    .from(stops)
    .innerJoin(stopTimes, eq(stopTimes.stopId, stops.stopId))
    .innerJoin(trips, eq(trips.tripId, stopTimes.tripId))
    .innerJoin(routes, eq(routes.routeId, trips.routeId))
    .innerJoin(directions, eq(directions.routeId, routes.routeId))
    .where(
      and(
        eq(routes.routeId, routeId),
        (query?.length ? like(stops.stopName, `%${query}%`) : undefined)
      )
    )
    .limit(300);
}

async function getStopsByLocationQuery(routeId:string, query:string|undefined, lat:number, lng:number, acc:number) {
  const accuracy = acc < 100 ? 100 : acc;
  const subquery = gtfsDB.select({
    stopId: stops.stopId,
    stopName: stops.stopName,
    stopLat: stops.stopLat,
    stopLon: stops.stopLon,
    distance: sql<string>`(
      6371000 * acos (
      cos ( radians(${lat}) )
      * cos( radians( stop_lat ) )
      * cos( radians( stop_lon ) - radians(${lng}) )
      + sin ( radians(${lat}) )
      * sin( radians( stop_lat ) )
      )
    )`
  })
  .from(stops)
  .where(({distance}) => lt(distance, accuracy))
  .as('stops');

  return gtfsDB
    .selectDistinct({
      stopId: stops.stopId,
      stopName: stops.stopName,
      direction: directions.direction,
    })
    .from(subquery)
    .innerJoin(stopTimes, eq(stopTimes.stopId, stops.stopId))
    .innerJoin(trips, eq(trips.tripId, stopTimes.tripId))
    .innerJoin(routes, eq(routes.routeId, trips.routeId))
    .innerJoin(directions, eq(directions.routeId, routes.routeId))
    .where(
      and(
        eq(routes.routeId, routeId),
        (query?.length ? like(stops.stopName, `%${query}%`) : undefined)
      )
    )
    .limit(300);
}

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);
  const { routeId, q, latitude, longitude, accuracy } = await getValidatedQuery(event, gtfsGetStopsQuerySchema.parse);
  try {
    if (latitude !== undefined && longitude !== undefined && accuracy !== undefined) {
      return getStopsByLocationQuery(routeId, q, latitude, longitude, accuracy);
    }
    return getStops(routeId, q);
  } catch(err:any) {
    throw createError({
      statusCode: 500,
    });
  }
});